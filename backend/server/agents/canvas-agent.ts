/**
 * Canvas Agent — Internal capability of the AI Tutor
 *
 * Handles all Canvas LMS related requests: grades, deadlines, assignments,
 * courses, upcoming exams, and academic calendar questions.
 *
 * Reads directly from fschool.* tables (populated by Canvas sync).
 * Never fabricates grades or deadlines — if data isn't synced, it says so.
 *
 * Triggered when the router detects: grade questions, deadline questions,
 * "what's due", "my GPA", "upcoming assignments", "course info" requests.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
);

export interface CanvasContext {
  upcomingAssignments: UpcomingAssignment[];
  recentGrades: RecentGrade[];
  courses: Course[];
  overallGPA?: number;
  missedAssignments: UpcomingAssignment[];
}

export interface UpcomingAssignment {
  title: string;
  courseCode: string;
  courseName: string;
  dueDate: string;
  daysUntilDue: number;
  pointsPossible?: number;
  submissionType?: string;
}

export interface RecentGrade {
  assignmentTitle: string;
  courseCode: string;
  score: number;
  pointsPossible: number;
  percentage: number;
  gradedAt: string;
}

export interface Course {
  code: string;
  name: string;
  currentGrade?: number;
  instructor?: string;
}

/**
 * Fetches Canvas data for a student from fschool.* tables.
 * Returns null if Canvas hasn't been synced yet.
 */
export async function fetchCanvasContext(personId: string): Promise<CanvasContext | null> {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get courses
    const { data: courses } = await supabase
      .schema('fschool')
      .from('courses')
      .select('code, name, current_grade, instructor')
      .eq('person_id', personId)
      .eq('is_active', true);

    if (!courses || courses.length === 0) return null;

    // Get upcoming assignments (next 7 days)
    const { data: upcoming } = await supabase
      .schema('fschool')
      .from('assignments')
      .select('title, course_code, course_name, due_date, points_possible, submission_type, submitted')
      .eq('person_id', personId)
      .eq('submitted', false)
      .gte('due_date', now.toISOString())
      .lte('due_date', sevenDaysFromNow.toISOString())
      .order('due_date', { ascending: true })
      .limit(10);

    // Get missed assignments
    const { data: missed } = await supabase
      .schema('fschool')
      .from('assignments')
      .select('title, course_code, course_name, due_date, points_possible, submission_type')
      .eq('person_id', personId)
      .eq('submitted', false)
      .lt('due_date', now.toISOString())
      .order('due_date', { ascending: false })
      .limit(5);

    // Get recent grades (last 14 days)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const { data: grades } = await supabase
      .schema('fschool')
      .from('grades')
      .select('assignment_title, course_code, score, points_possible, graded_at')
      .eq('person_id', personId)
      .gte('graded_at', twoWeeksAgo.toISOString())
      .order('graded_at', { ascending: false })
      .limit(10);

    const upcomingAssignments: UpcomingAssignment[] = (upcoming || []).map(a => ({
      title: a.title,
      courseCode: a.course_code,
      courseName: a.course_name,
      dueDate: a.due_date,
      daysUntilDue: Math.ceil((new Date(a.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      pointsPossible: a.points_possible,
      submissionType: a.submission_type,
    }));

    const recentGrades: RecentGrade[] = (grades || []).map(g => ({
      assignmentTitle: g.assignment_title,
      courseCode: g.course_code,
      score: g.score,
      pointsPossible: g.points_possible,
      percentage: Math.round((g.score / g.points_possible) * 100),
      gradedAt: g.graded_at,
    }));

    const courseList: Course[] = (courses || []).map(c => ({
      code: c.code,
      name: c.name,
      currentGrade: c.current_grade,
      instructor: c.instructor,
    }));

    const missedAssignments: UpcomingAssignment[] = (missed || []).map(a => ({
      title: a.title,
      courseCode: a.course_code,
      courseName: a.course_name,
      dueDate: a.due_date,
      daysUntilDue: Math.ceil((new Date(a.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      pointsPossible: a.points_possible,
      submissionType: a.submission_type,
    }));

    // Calculate overall GPA from current grades
    const gradesWithValues = courseList.filter(c => c.currentGrade !== undefined && c.currentGrade !== null);
    const overallGPA = gradesWithValues.length > 0
      ? Math.round(gradesWithValues.reduce((sum, c) => sum + (c.currentGrade || 0), 0) / gradesWithValues.length)
      : undefined;

    return {
      upcomingAssignments,
      recentGrades,
      courses: courseList,
      overallGPA,
      missedAssignments,
    };
  } catch (err) {
    console.error('[CanvasAgent] Error fetching canvas context:', err);
    return null;
  }
}

/**
 * Formats Canvas data as a system prompt section for the AI Tutor.
 * Injected into the system prompt when a Canvas-related question is detected.
 */
export function buildCanvasAgentPrompt(
  studentName: string,
  brainContext: string,
  canvasCtx: CanvasContext
): string {
  const { upcomingAssignments, recentGrades, courses, overallGPA, missedAssignments } = canvasCtx;

  const upcomingSection = upcomingAssignments.length > 0
    ? `UPCOMING ASSIGNMENTS (next 7 days):\n${upcomingAssignments.map(a =>
        `- ${a.title} (${a.courseCode}) — due in ${a.daysUntilDue} day${a.daysUntilDue === 1 ? '' : 's'}${a.pointsPossible ? `, ${a.pointsPossible} pts` : ''}`
      ).join('\n')}`
    : 'UPCOMING ASSIGNMENTS: None in the next 7 days.';

  const missedSection = missedAssignments.length > 0
    ? `\nMISSED ASSIGNMENTS (not submitted, past due):\n${missedAssignments.map(a =>
        `- ${a.title} (${a.courseCode}) — was due ${Math.abs(a.daysUntilDue)} day${Math.abs(a.daysUntilDue) === 1 ? '' : 's'} ago`
      ).join('\n')}`
    : '';

  const gradesSection = recentGrades.length > 0
    ? `\nRECENT GRADES:\n${recentGrades.map(g =>
        `- ${g.assignmentTitle} (${g.courseCode}): ${g.score}/${g.pointsPossible} (${g.percentage}%)`
      ).join('\n')}`
    : '';

  const coursesSection = courses.length > 0
    ? `\nCURRENT COURSES:\n${courses.map(c =>
        `- ${c.code}: ${c.name}${c.currentGrade !== undefined ? ` — current grade: ${c.currentGrade}%` : ''}`
      ).join('\n')}`
    : '';

  const gpaSection = overallGPA !== undefined ? `\nOVERALL AVERAGE: ${overallGPA}%` : '';

  return `You are ${studentName}'s personal academic AI. Right now you are answering a question about their Canvas courses, grades, or deadlines.

STUDENT BRAIN CONTEXT:
${brainContext}

LIVE CANVAS DATA:
${upcomingSection}${missedSection}${gradesSection}${coursesSection}${gpaSection}

YOUR ROLE RIGHT NOW:
- Answer the student's question using their actual Canvas data above
- Be direct — give the real numbers, real deadlines, real grades
- If something looks urgent (missed assignment, grade drop, deadline in <48 hours), flag it
- If Canvas data isn't available for something they asked, say so honestly — don't guess
- Keep it concise unless they ask for detail
- Sound personal, direct, like you've been watching their academic life`;
}

/**
 * Detects if a message is a Canvas-related question.
 * Used by brain-chat-session to decide whether to inject Canvas context.
 */
export function isCanvasQuery(message: string): boolean {
  const canvasKeywords = [
    'due', 'deadline', 'assignment', 'grade', 'gpa', 'course', 'class',
    'exam', 'quiz', 'test', 'submit', 'submission', 'canvas', 'mark',
    'score', 'percent', 'pass', 'fail', 'credit', 'module', 'lecture',
    'what do i have', 'what\'s due', "what's due", 'upcoming', 'overdue',
    'missed', 'late', 'professor', 'instructor', 'syllabus', 'schedule',
    'how am i doing', 'my grades', 'my courses', 'semester',
  ];
  const lower = message.toLowerCase();
  return canvasKeywords.some(kw => lower.includes(kw));
}
