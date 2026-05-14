# FschoolAI - NeuroOS: Personal Academic Intelligence

🧠 **NeuroOS** is an AGI-level system that understands students deeply and provides personalized academic support through continuous learning and synthesis.

## Architecture

### Layer 1: Quantified Self 📊
- Behavioral signals (typing speed, focus, submission timing)
- Emotional signals (confidence, stress, motivation)
- Knowledge signals (mastery, learning style)
- Context signals (location, time, device)
- Outcome signals (grades, completion time)
- Biometric signals (heart rate, sleep, activity)
- Facial expression analysis
- Voice analysis

### Layer 2: Second Brain 🧠
- Zettelkasten (atomic ideas)
- Concept progress tracking
- Concept connections (graph relationships)
- Insights extraction

### Layer 3: Emotional Intelligence ❤️
- Emotional state tracking
- Coping strategies
- Cognitive support sessions
- Genuine empathy engine

### Layer 4: Synthesis & Agency 🤖
- Situation synthesis
- Predictive models
- Personalized recommendations
- Autonomous actions
- Feedback loops

### Layer 5: Operations 📋
- Agent outputs tracking
- Changelog (transparency)

## Automatic Deployment

This repo uses **GitHub Actions** to automatically deploy schema changes to Supabase:

1. **Create migration files** in `supabase/migrations/`
2. **Push to main branch**
3. **GitHub Actions automatically deploys** to Supabase
4. **Zero manual steps needed**

### Setup GitHub Secrets

Add these secrets to your GitHub repo:
- `SUPABASE_ACCESS_TOKEN` - Your Supabase access token
- `SUPABASE_DB_PASSWORD` - Your Supabase database password

## Agents

- **Canvas Watcher** - Monitors Canvas for assignments, grades, deadlines
- **Writing Intelligence** - Analyzes student submissions
- **Professor Intelligence** - Learns grading patterns
- **Lecture Recording** - Processes audio from lectures
- **Library Organizer** - Organizes learning resources
- **Situation Synthesizer** - Synthesizes all signals into insights

## Database

- **Supabase** - PostgreSQL database
- **22 tables** - Complete schema for all layers
- **Row Level Security** - Privacy-first design
- **Automatic migrations** - Via GitHub Actions

## Getting Started

```bash
# Clone repo
git clone https://github.com/vincentyang0702-pixel/FschoolAI-.git
cd FschoolAI-

# Add migration files
# Migrations automatically deploy to Supabase on push to main

# View migrations
ls supabase/migrations/

# Deploy manually (if needed)
supabase db push
```

## Status

✅ Complete NeuroOS schema  
✅ GitHub Actions CI/CD  
✅ Automatic Supabase deployment  
⏳ Agent implementations  
⏳ Frontend integration  

## License

MIT
# GitHub integration enabled - triggering deployment
