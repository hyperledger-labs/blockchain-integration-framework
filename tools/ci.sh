#!/usr/bin/env bash

###
### Continous Integration Shell Script
###
### Designed to be re-entrant on a local dev machine as well, not just on a
### newly pulled up VM.
###
echo $BASH_VERSION

STARTED_AT=`date +%s`
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT_DIR="$SCRIPT_DIR/.."
CHANGED_FILES="$(git diff-index --name-only HEAD --)"

function checkWorkTreeStatus()
{
  git update-index -q --refresh
  new_changed_files="$(git diff-index --name-only HEAD --)"
  if [ "${CHANGED_FILES}" != "${new_changed_files}" ]; then
    echo >&2 "Changes in the git index have been detected!"
    exit 1
  fi
}

function dumpDiskUsageInfo()
{

  if ! [ -x "$(command -v df)" ]; then
    echo 'df is not installed, skipping...'
  else
    df || true
  fi
  if ! [ -x "$(command -v docker)" ]; then
    echo 'docker is not installed, skipping...'
  else
    docker system df || true
  fi
}

function mainTask()
{
  set -euxo pipefail

  if ! [ -x "$(command -v lscpu)" ]; then
    echo 'lscpu is not installed, skipping...'
  else
    lscpu || true
  fi

  if ! [ -x "$(command -v lsmem)" ]; then
    echo 'lsmem is not installed, skipping...'
  else
    lsmem || true
  fi

  if ! [ -x "$(command -v smem)" ]; then
    echo 'smem is not installed, skipping...'
  else
    smem --abbreviate --totals --system || true
  fi

  dumpDiskUsageInfo

  # If we are running in a GitHub Actions runner, then free up 30 GB space by
  # removing things we do not need such as the Android SDK and .NET.
  #
  # Huge thanks to Maxim Lobanov for the advice:
  # https://github.com/actions/virtual-environments/issues/2606#issuecomment-772683150
  #
  # Why do this? Because we've been getting warnings about the runners being
  # left with less than a hundred megabytes of disk space during the tests.
  if [ "${GITHUB_ACTIONS:-false}" = "true" ]; then
    echo 'Detected GitHub Action Runner deleting Android and .NET ...'
    sudo rm -rf /usr/local/lib/android # will release about 10 GB if you don't need Android
    sudo rm -rf /usr/share/dotnet # will release about 20GB if you don't need .NET
  fi

  dumpDiskUsageInfo

  docker --version
  docker-compose --version
  node --version
  npm --version
  java -version

  # install npm 7 globally - needed because Node v12, v14 default to npm v6
  npm install -g npm@7.14.0
  npm --version

  ### COMMON
  cd $PROJECT_ROOT_DIR

  # https://stackoverflow.com/a/61789467
  npm config list
  npm config delete proxy
  npm config delete http-proxy
  npm config delete https-proxy

  # https://stackoverflow.com/a/15483897
  npm cache verify
  npm cache clean --force
  npm cache verify

  npm ci
  ./node_modules/.bin/lerna bootstrap

  # The "quick" build that is enough for the tests to be runnable
  npm run build:dev:backend

  # Tests are still flaky (on weak hardware such as the CI env) despite our best
  # efforts so here comes the mighty hammer of brute force. 3 times the charm...
  {
    dumpDiskUsageInfo
    npm run test:all -- --bail && echo "$(date +%FT%T%z) [CI] First (#1) try of tests succeeded OK."
  } ||
  {
    dumpDiskUsageInfo
    echo "$(date +%FT%T%z) [CI] First (#1) try of tests failed starting second try now..."
    npm run test:all -- --bail && echo "$(date +%FT%T%z) [CI] Second (#2) try of tests succeeded OK."
    
  } ||
  {
    dumpDiskUsageInfo
    # If the third try fails then the execution will reach the last echo and the exit 1 statement
    # ensuring that the script crashes if 3 out of 3 test runs have failed.
    echo "$(date +%FT%T%z) [CI] Second (#2) try of tests failed starting third and last try now..."
    npm run test:all -- --bail && echo "$(date +%FT%T%z) [CI] Third (#3) try of tests succeeded OK." || \
      echo "$(date +%FT%T%z) [CI] Third (#3) try of tests failed so giving up at this point" ; exit 1
  }

  dumpDiskUsageInfo

  # The webpack production build needs more memory than the default allocation
  export NODE_OPTIONS=--max_old_space_size=4096

  # We run the full build last because the tests don't need it so in the interest
  # of providing feedback about failing tests as early as possible we run the
  # dev:backend build first and then the tests which is the fastest way to get
  # to a failed test if there was one.
  npm run build

  ENDED_AT=`date +%s`
  runtime=$((ENDED_AT-STARTED_AT))
  echo "$(date +%FT%T%z) [CI] SUCCESS - runtime=$runtime seconds."
  checkWorkTreeStatus
  exit 0
}

function onTaskFailure()
{
  set +eu # do not crash process upon individual command failures

  ENDED_AT=`date +%s`
  runtime=$((ENDED_AT-STARTED_AT))
  echo "$(date +%FT%T%z) [CI] FAILURE - runtime=$runtime seconds."
  exit 1
}

(
  mainTask
)
if [ $? -ne 0 ]; then
  onTaskFailure
fi
