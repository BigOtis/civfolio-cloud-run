---
name: publish-cloud-run-site
description: Publish a web site to a new GitHub repository and deploy it as a Google Cloud Run service.
---

# Publish Cloud Run Site Skill

This skill guides the agent through pushing the current project to a new GitHub repository and deploying it as a service on Google Cloud Run.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Google Cloud SDK (`gcloud`) installed and authenticated
- Docker (for building images, though Cloud Build can be used)
- The project should be a web application (e.g., Next.js)

## Workflow Steps

1. **Gather Information**
   - Use the ask-questions tool to collect:
     - GitHub repository name (required)
     - Google Cloud project ID (required)
     - Cloud Run service name (optional, defaults to repo name)
     - Region (optional, defaults to us-central1)

2. **Get GitHub Username**
   - Run `gh auth status` and parse the username from the output.

3. **Create GitHub Repository**
   - Run `gh repo create <repo-name> --public --description "Deployed site"`

4. **Prepare Git Repository**
   - If not already a git repo: `git init`
   - Add remote: `git remote add origin https://github.com/<username>/<repo-name>.git`
   - Add all files: `git add .`
   - Commit: `git commit -m "Initial commit"`
   - Push: `git push -u origin main`

5. **Prepare for Deployment**
   - If no Dockerfile exists, create one appropriate for the project type (e.g., for Next.js, use the standard Next.js Dockerfile)
   - Ensure package.json has build and start scripts

6. **Deploy to Cloud Run**
   - Set gcloud project: `gcloud config set project <project-id>`
   - Deploy: `gcloud run deploy <service-name> --source . --platform managed --region <region> --allow-unauthenticated`

7. **Output Results**
   - Provide the GitHub repo URL
   - Provide the Cloud Run service URL

## Error Handling

- If gh or gcloud not authenticated, prompt user to authenticate
- If repo name exists, ask for a different name
- If build fails, check Dockerfile and project setup

## Assets

- Dockerfile template for Next.js (bundled in skill folder if needed)</content>
<parameter name="filePath">C:\Users\otis1\git\CivFolio\.github\skills\publish-cloud-run-site\SKILL.md