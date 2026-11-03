# Market Town: your account setup checklist

November 3, 2026. The GitHub connection currently shows your six existing repositories, but no accessible market-town repository. If you already created it, start at B and grant access rather than creating a duplicate.

## A. Create the repository now

1. Open https://github.com/new and sign in.
2. Owner: choose Geezusotl.
3. Repository name: enter market-town.
4. Description: A living economic simulation with reproducible experiments.
5. Select Public for the portfolio.
6. Leave README, .gitignore, license and AI-generated initialization options off. Prepared project files will supply these.
7. Click Create repository.
8. Keep that page open. Its address should be https://github.com/Geezusotl/market-town.

Success: the repository exists under your account. It can be empty at this point. These steps follow https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository.

## B. Give the existing connection access

1. Open https://github.com/settings/installations.
2. Find the installed app used for this ChatGPT/Codex GitHub connection. Identify it from the connection you already configured; app naming can vary.
3. Click Configure for that app and your personal account.
4. Under Repository access, if Only select repositories is enabled, open the repository selector.
5. Add market-town while preserving the other selected repositories.
6. Click Save.
7. Return here and paste the repository URL. I will verify access; you do not need to upload files manually.

If All repositories is already enabled, the new repository should be covered; I will check. No token or password belongs in chat. Reference: https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps.

## C. Enable the public demo after source and deployment workflow are uploaded

Wait for me to verify the repository and upload its workflow first. Then:

1. Open the repository.
2. Click Settings.
3. In the sidebar, click Pages.
4. Under Build and deployment, set Source to GitHub Actions.
5. Return here and tell me Pages is enabled.

I will run or inspect deployment and verify the actual published URL. If a deployment approval or disabled Actions setting blocks it, I will give the exact next step based on the observed error. GitHub Pages is static hosting, so the browser simulation runs while a visitor uses it. It is not the future unattended server.

Reference: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site.

## D. Other accounts: later, only if needed

| Service | Do you need to set it up now? | Trigger |
| --- | --- | --- |
| GitHub Pages / Actions | Same GitHub account | Public browser demo |
| Heroku | No | Persistent world tested locally and concrete costs presented |
| Separate database provider | No | Not required for browser demo; later storage chosen with hosting |
| Azure | No | Alternative hosting only if we choose it |
| Sentry | No | Optional error monitoring after public deployment |
| Polypane / LambdaTest | No | Optional student browser testing benefits |
| Claude | No new setup | Existing account, optional broad reviews at milestones |
| Cursor | No | Not required for this project |
| LLM API billing | No | Core simulation uses no model API |
| Domain name | No | Default Pages URL is sufficient |

Student offers are not automatically activated by having the pack. We will verify each actual offer and expiry before relying on it. For Heroku I will first present the service configuration, recurring cost, credit coverage, and shutdown steps. Then you handle eligibility and billing in the official account pages. No hosting purchase is needed now.

You do not need to install Node, Git, an editor, or testing tools to do A through C. Local execution remains optional; I handle implementation and checks.
