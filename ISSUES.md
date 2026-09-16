# SELENE issue backlog

Copy each heading and its bullets into a GitHub issue.

## Separate rendered notebooks from runnable standalone notebooks

- Render the normal notebook in SELENE.
- Use only the matching standalone notebook for Colab and downloads.
- Keep the mapping explicit and report missing standalone files instead of linking to the wrong file.

## Preserve notebook rendering fidelity

- Render inline and display LaTeX correctly.
- Render images at an appropriate size.
- Preserve supported animations.
- Show output for every cell from the source notebook.

## Add incremental source notebook health checks

- Validate notebook structure and formatting without executing notebooks.
- Recheck only files whose content has changed since the previous successful run.
- Use content hashes and cached results; draw on build-cache patterns where useful.
- Make failures visible in the admin dashboard.

## Protect the admin endpoint

- Move all admin features behind a password-protected admin endpoint.
- Store the shared admin password as a Cloudflare-managed secret, not in the repository.
- Provide access to source health-check results, the Path Editor, and Learning Path specification.

## Add editable learner paths

- Add learner paths to the appropriate learner-facing page and remove the Path Editor from the home page.
- Use `learner-path.png` as the layout reference.
- Start with three editable paths: Learning from data, Neural networks by hand, and Language models end to end.
- Define four stages per path; begin Learning from data with Set up your workbench, Fit your first models, Learn how models learn, and Find structure without labels.
- Let admins edit path stages and lesson order from the protected admin page.

## Run notebook cells in the browser with Jax.js

- Let learners run supported notebook cells inline in their browser using [Jax.js](https://jax-js.com/).
- Do not send notebook execution to SELENE servers.
- Clearly show unsupported cells and execution failures.

## Track learning progress by device

- Create a device identifier for progress tracking.
- Show completed lessons and remaining lessons in learner paths and topic views.
- Keep the progress model clear to the user.

## Audit site naming

- Replace vague or spurious labels across the site with clear, task-specific names.
- Review navigation, actions, headings, empty states, and admin language.

## Add the NUS SoC AI Society collaboration to About

- Update the About page to describe the NUS SoC AI Society collaboration in SELENE's development.
