# Android APK Automation Setup

This repository now includes automated APK build and release via GitHub Actions.

## Added files

- `.github/workflows/android-apk-release.yml`
- `eas.json`

## What the workflow does

1. Builds Android debug APK in GitHub Actions using Expo prebuild + Gradle.
2. Copies the APK as `prototypes/reformed-church.apk`.
3. Publishes the APK to a GitHub Release.
4. Optionally deploys `prototypes/` to Netlify so `/reformed-church.apk` is live.

## Required GitHub Secrets

Set these in GitHub repo settings: `Settings -> Secrets and variables -> Actions`.

### Optional for automatic Netlify deploy

- `NETLIFY_AUTH_TOKEN`: Personal access token from Netlify.
- `NETLIFY_SITE_ID`: Netlify site ID for the download site.

Your download site ID appears to be:

- `e99786ca-e6dd-4b0e-a054-ddc73a3e7a46`

## How to run

1. Push this workflow to `main`.
2. In GitHub, open `Actions -> Build Android APK`.
3. Click `Run workflow`.
4. Wait for completion.

## Result

- APK is attached to a GitHub release.
- If Netlify secrets are set, the site is deployed with `prototypes/reformed-church.apk`.

## Notes

- `eas.json` is kept in the repo for future EAS usage, but this workflow does not require EAS auth token.
- Android package ID is already set in `app.json` as `com.cojclds.app`.
