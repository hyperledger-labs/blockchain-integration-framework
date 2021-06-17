- [Git Know How / Reading List](#git-know-how--reading-list)
- [PR Checklist - Contributor/Developer](#pr-checklist---contributordeveloper)
- [PR Checklist - Maintainer/Reviewer](#pr-checklist---maintainerreviewer)
- [Create local branch](#create-local-branch)
  - [Directory structure](#directory-structure)
- [Test Automation](#test-automation)
  - [Summary](#summary)
  - [Test Case Core Principles](#test-case-core-principles)
- [Working with the Code](#working-with-the-code)
  - [Running/Debugging the tests](#runningdebugging-the-tests)
    - [Running a single test case](#running-a-single-test-case)
    - [Running all test cases (unit+integration)](#running-all-test-cases-unitintegration)
    - [Running unit tests only](#running-unit-tests-only)
    - [Running integration tests only](#running-integration-tests-only)
    - [What is npx used for?](#what-is-npx-used-for)
    - [Debugging a test case](#debugging-a-test-case)
  - [All-In-One Docker Images for Ledger Connector Plugins](#all-in-one-docker-images-for-ledger-connector-plugins)
    - [Test Automation of Ledger Plugins](#test-automation-of-ledger-plugins)
  - [Building the SDK](#building-the-sdk)
  - [Adding a new public npm dependency to one of the packages:](#adding-a-new-public-npm-dependency-to-one-of-the-packages)
  - [Adding a sibling package npm dependency to one of the packages:](#adding-a-sibling-package-npm-dependency-to-one-of-the-packages)
  - [Reload VSCode Window After Adding Dependencies](#reload-vscode-window-after-adding-dependencies)
  - [On Reproducible Builds](#on-reproducible-builds)

Thank you for your interest to contribute to Hyperledger Cactus! :tada:

First things first, please review the [Hyperledger Code of Conduct](https://wiki.hyperledger.org/display/HYP/Hyperledger+Code+of+Conduct) before participating.

There are many ways to contribute to Hyperledger Cactus, both as a user and as a developer.

As a user, this can include:
* [Making Feature/Enhancement Proposals](https://github.com/hyperledger/cactus/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=)
* [Reporting bugs](https://github.com/hyperledger/cactus/issues/new?assignees=&labels=bug&template=bug_report.md&title=)

As a developer:
* if you only have a little time, consider picking up a [“help-wanted”](https://github.com/hyperledger/cactus/labels/help%20wanted) or ["good-first-issue"](https://github.com/hyperledger/cactus/labels/good%20first%20issue) task
* If you can commit to full-time development, then please contact us on our [Rocketchat channel](https://chat.hyperledger.org/channel/cactus) to work through logistics!

## Git Know How / Reading List

This section is for you if you do not know your way around advanced git concepts such as
- rebasing (interactive or otherwise)
- splitting commits/PRs
- when to use and not to use force push

A word on the controversial topic of force pushes:
In many git guides you will read that force push is basically forbidden.
This is true 99% of the time, BUT if you are the only person working on a branch (which is most of time true for a feature/fix branch of yours that you are planning to submit as a PR) then force pushing is not just allowed but necessary to avoid messy git commit logs.
The question you need to ask yourself before force pushing is this: Am I going to destroy someone else's work on the remote branch? If nobody else is working on the branch then the answer is of course no and force push can be used safely. If others are working with you on the branch on the other hand, it is considered polite to ask and warn them in advance prior to force pushing so that they can take the necessary precautions on their side as well.

A handy tool to avoid destroying other's work accidentally is the new(ish) git feature called `--force-with-lease`:
Using `git push --force-with-lease` instead of vanilla `--force` is highly recommended: https://softwareengineering.stackexchange.com/a/312710

The rustlang documentation has an excellent write-up and additional links on pretty much everything you need to know.
The only difference between their PR requirements and Cactus' is that we do encourage people referencing github issues in commit messages.
Quoting the most relevant parts below (and thanks to the Rust maintainers for this).

> Pull requests are the primary mechanism we use to change Rust. GitHub itself has some great documentation on using the Pull Request feature. We use the "fork and pull" model described here, where contributors push changes to their personal fork and create pull requests to bring those changes into the source repository.
>
> Please make pull requests against the main branch.
>
> Rust follows a no merge policy, meaning, when you encounter merge conflicts you are expected to always rebase instead of merge. E.g. always use rebase when bringing the latest changes from the main branch to your feature branch. Also, please make sure that fixup commits are squashed into other related commits with meaningful commit messages.
>
> GitHub allows closing issues using keywords. This feature should be used to keep the issue tracker tidy.

Source: https://github.com/rust-lang/rust/blob/53702a67e2ae8a404169a0329f6a38d73bf7494d/CONTRIBUTING.md#pull-requests

Further reading:
- https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-collaborative-development-models
- https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests


## PR Checklist - Contributor/Developer
**To avoid issues in the future, do not install dependencies globally. Ensure all dependencies are kept self-contained.**

1. Fork [hyperledger/cactus](https://github.com/hyperledger/cactus) via Github UI
   - If you are using the Git client on the Windows operating system, you will need to enable long paths for git
     which you can do in PowerShell by executing the command below.
     To clarify, this may also apply if you are using any Git GUI application on Windows such as `Github Desktop` or others.

     ```shell
     git config --global core.longpaths true
     ```

2. Clone the fork to your local machine
3. (Optional) [Create local branch](#create-local-branch) for minimizing code conflicts when you want to contribute multiple changes regarding different issues in parallel.
4. Complete the desired changes and where possible test locally
   1. You can run the full CI suite on Mac/Linux/WSL by running the script at `./tools/ci.sh`
   2. If you do not have your environment set up for running bash scripts, do not worry, all pull requests will automatically have the same script executed for it when opened. The only downside is the slower feedback loop.
5. Make sure you have set up your git signatures
   1. Note: Always sign your commits using the `git commit -S`
   2. For more information see [here](https://gist.github.com/tkuhrt/10211ae0a26a91a8c030d00344f7d11b)
6. Think about/decide on what your commit message will be.
   1. The commit message syntax might be hard to remember at first so you we invite you to use the `npm run commit` command which upon execution presents you with a series of prompts that you can fill out and have your input validated in realtime, making it impossible (or at least much harder) to produce an invalid commit message that the commit lint bot on Github will flag with an error.
      1. The use of this tool described above is entirely optional in case you need a crutch.
      2. Note that running the `npm run commit` command will also attempt to perform the actual commit at the end unless you kill the process with `Ctrl + C` or whatever is your terminal's shortcut for the same action.
      3. The `npm run commit` command will also attempt to sign the produced commit so make sure that it is set up properly prior to using it.
7. Commit your changes
    1. Make sure your commit message follows the formatting requirements (details above) and here: [Conventional Commits syntax](https://www.conventionalcommits.org/en/v1.0.0-beta.4/#specification); this aids in release notes generation which we intend to automate
    2. Be aware that we are using git commit hooks for the automation of certain mundane tasks such as applying the required code style and formatting so your code will be wrapped at 80 characters each line automatically. If you wish to see how your changes will be altered by the formatter you can run the `npm run prettier` command from a terminal or install an IDE extension for the `Prettier` tool that can do the same (VSCode has one that is known to work).
8. Ensure your branch is rebased onto the `upstream` main branch where `upstream` is fancy git talk for the main Cactus repo on Github (the one you created your fork from).
   1. If you are having trouble, there are many great resources out there (so we will not write another here).
      1. If you are having trouble locating a suitable guide specifically on the mechanics of rebasing, we can recommend [this one](https://thoughtbot.com/blog/git-interactive-rebase-squash-amend-rewriting-history). Thanks to Rafael for the link!
      2. If you went through that tutorial and still not quite sure what's up, give this one a shot as well: https://about.gitlab.com/blog/2020/11/23/keep-git-history-clean-with-interactive-rebase/
   2. If merge conflicts arise, you must fix these at rebase time since omitting this step does not magically make the conflicts go away, just pushes it over the fence to the maintainer who will attempt to merge your pull request at a later point in time.
   3. If the above happens, at that point said maintainer will most likely ask you (if not already) to perform the rebase anyway since as the author of a change you are best positioned to resolve any conflicts on the code level. Occassionally maintainers may do the merge/conflict resolution themselves, but do not count on this nor try to make a habit out of relying on the potential kindness.
   4. After successful rebasing, take another look at your commit(s). Ideally there should be just one in each pull request, but also on the other hand each commit should be as small, simple and self contained as possible, so there can be cases where it makes sense to submit a PR with multiple commits if for example you also had to change something in the test tooling while implementing a feature (in which case there could be a commit for the feature itself and another for the necessary changes to the test tooling package). What we respectfully ask though is that you try to avoid these situations and submit most of your PRs with a single, self contained commit that does not touch multiple things. This significantly reduces the cognitive load required to review the changes which in turn makes everyone happier: the maintainers will have an easier job reviewing, which means they'll be doing it faster which will (probably) cause you joy in turn.
9.  Push your changes to your main (or whatever you named your feature branch, that is entirely up to you at the end of the day)
10. Initiate a pull request from your fork to the base repository
   5. Remember: Opening a pull request is like saying "Hey maintainers, I have this change finalized and ready for you to spend time on reviewing it." The word `finalized` here is understood to imply that you are not planning on doing any more changes on the branch apart from when being asked to by the reviewers.
   6. It is perfectly acceptable to open a pull request and mark it as `draft` (a GitHub feature) which then signals to the maintainers that if they have time, they are welcome to look at the change, but it may or may not be in its final form yet so you are not responsible for potential loss of time on their end if the review has to be performed multiple times on account of changes. Once you promote your draft PR to a real one, the comments from the point above apply however.
   7. If your pull request contains a significant change, we recommend that you apply the similarly named github label on in it as well. It is okay if you do not do this, if we detect that the change is indeed significant, we will apply the label. If you do it in advance however, it will probably speed up the proceedings by removing one communication roundtrip from the review process of your pull request.
11. Await CI, DCO & linting quality checks, as well as any feedback from reviewers
12. If you need to update your pull request either because you discovered an issue or because you were asked to do so we ask that you:
   8.  try to add the change in a way that does not produce additional commits on the PR but instead do an `git commit --amend --signoff` on your local branch and then a force push to the remote branch of yours (the PR essentially). Again, if the change you are doing does not fit within any one of the existing commits of your PR, then it is justified to add a new commit and this is up to your discretion (maintainers may respectfully ask you to squash if they see otherwise)
   9.  The rule of thumb for any and all things in git/Cactus is to maintain a clean, tidy commit log/history that enables everyone to easily look up changes and find accurate answers to the basic questions of `Who? / What? / When / Why?`. If you have ever been in a situation when you tried to figure out the original point a bug was introduced (and tried to figure out why the offending change was made in the first place) and the git blame just lead you to a 10 megabyte large patch with the message 'merge xyz', then you know exactly what it is we are trying to avoid here. :-)

## PR Checklist - Maintainer/Reviewer

Ensure all the following conditions are met (on top of you agreeing with the change itself)

1. All automated checks that are not explicitly called out here are also passing/green.
2. Branch is rebased onto main and there are no dangling/duplicate commits.
3. Commits appear simple and self contained. Simple is always relative to the mangitude of the change itself of course. A 1k line change can still be simple if all it does is rename some commonly used variable in each place its being used.
4. If the contributors are having trouble with git basic functionality such as rebasing / force pushing, DCO, do your best to help them out, when in doubt feel free to reach out to Peter (who is the one insisting an all these git rules so he deserves to be the primary contact for all git related issues).
   1. Remember that we want to foster a welcoming community so if someone is new to git try to be extra patient with them on this front.
5. Ensure the commit messages are according to the standard format.
   1. Remember that if you select 'squash' on the Github UI when accepting the pull request, Github will (by default) offer up the title of the pull request as the new commit message for your squash commit. This is not good unless the title happens to be a valid commit message, but in the likely event of it not being as such, you must take special care to type in a valid commit message right there and then on the Github UI.
   2. To avoid the hassle/potential issues with the above, it is recommended that you always use 'rebase' when accepting a pull request even if there are multiple commits that you'd otherwise like to see squashed.
   3. If you are adamant that you do not want to merge a PR with multiple commits, that is completely understandable and fair game. The recommended approach there is to ask the contributor to break the pull request up to multiple pull requests by doing an interactive rebase on their branch and cherry picking/re-ordering things accordingly. This is a fairly advanced git use case so you might want to help them out with it (or ask Peter who is the one constantly nagging everyone about these git rules...)

To protect the Hyperledger Cactus source code, GitHub pull requests are accepted from forked repositories only. There are also quality standards identified and documented here that will be enhanced over time.

## Create local branch

> Whenever you begin work on a new feature or bugfix, it's important that you create a new branch.

1. Clone your fork to your local machine
2. Setup your local fork to keep up-to-date (optional)
   ```
   # Add 'upstream' repo to list of remotes
   git remote add upstream https://github.com/hyperledger/cactus.git

   # Verify the new remote named 'upstream'
   git remote -v

   # Checkout your main branch and rebase to upstream.
   # Run those commands whenever you want to synchronize with main branch
   git fetch upstream
   git checkout main
   git rebase upstream/main
   ```
3. Create your branch.
   ```
   # Checkout the main branch - you want your new branch to come from main
   git checkout main

   # Create a new branch named `<newfeature>` (give simple informative name)
   git branch <newfeature>
   ```
4. Checkout your branch and add/modify files.
   ```
   git checkout <newfeature>
   git rebase main
   # Happy coding !
   ```
5. Commit changes to your branch.
   ```
   # Commit and push your changes to your fork
   git add -A
   git commit -s -m "<type>[optional scope]: <description>"
   git push origin <newfeature>
   ```
6. Once you've committed and pushed all of your changes to GitHub, go to the page for your fork on GitHub, select your development branch, and click the pull request button.
7. Repeat step 3 to 6 when you need to prepare posting new pull request.

NOTE: Once you submitted pull request to Cactus repository, step 6 is not necessary when you made further changes with `git commit --amend` since your amends will be sent automatically.

NOTE: You can refer original tutorial ['GitHub Standard Fork & Pull Request Workflow'](https://gist.github.com/Chaser324/ce0505fbed06b947d962)

### Directory structure

Whenever you begin to use your codes on Hyperledger Cactus, you should follow the directory strecture on Hyperledger Cactus.
The current directory structure is described as the following:

> - contrib/ : Contributions from each participants, which are not directly dependent on Cactus code.
>   - Fujitsu-ConnectionChain/
>   - Accenture-BIF/
> - docs/
>   - API/
>     - business-logic-plugin.md
>     - ledger-plugin.md
>     - routing-interface.md
> - examples/
>   - example01-car-trade/
>     - src/
> - plugins/
>     - business-logic-plugin/
>       - lib/ : libraries for building Business Logic Plugin
>     - ledger-plugin/ : Codes of Ledger Plugin
>       - (ledger-name)/ : Including the ledger name (e.g. Ethereum, Fabric, ...)
>         - verifier/
>           - src/ : Source codes of Verifier on Ledger Plugin
>           - unit-test/ : Unit test codes of Verifier on Ledger Plugin (single driver / driver and docker env / ...)
>         - validator/
>           - src/ : Source codes of Validator on Ledger Plugin
>           - unit-test/ : Unit test codes of Validator on Ledger Plugin (single driver / driver and docker env / ...)
>     - routing-interface/
> - whitepaper/
> - test/
>   - docker-env/
>   - kubernetes-env/

## Test Automation

> Mantra: Testable code is maintainable code

### Summary

We are all about automating the developer flow wherever possible and a big part
of this is automated testing of course.

Whenever contributing a change it is important to have test coverage for the
specific change that you are making. This is especially important for bugs and
absolutely essential for security related changes/fixes.

Writing testable code is very important to us as not doing so can (and will)
snowball into an avalanche of technical debt that will eventually destroy code
quality and drive people away who would otherwise be happy to contribute and use
the software. So, we want to make sure that does not happen with all this.

This also means that occassionally, when making a change that looks simple on
the surface you may find that the reviewer of your pull request asks you to do
additional, seemingly unrelated changes that have nothing to do with the actual
feature/bug that you just implemented/fixed, but instead are designed to ensure
that tests can be written for it or for related code.

This can feel like a chore (because it is) but we respectfully ask everyone to
try their best in accomodating this because it really helps steering the ship
on the long run.

One of the simplest examples for the above is when you have a class that does
something, anything, and it depends on some shared resource to achieve it. The
shared resource can be the file system or a network port that is open for TCP
connections for example.
You can implement your class hardcoding the port number
and functionally it will be correct (if you did that part right) *BUT* if your
class does not allow for the customization of said port through the constructor
or a setter method, then one of our more obsessive maintainers (like Peter) will
immediately be onto you asking for a change so that the port can be customized
at runtime, allowing test cases to pass in port 0 that makes the test executable
in parallel with other tests without being flaky.

If you oppose this idea, said maintainers will happily refer you to this writing
or conjure up an entirely new essay right there on the pull request.

### Test Case Core Principles

There are other principles specific per unit and integration tests, but the list
below applies to all tests regardless of their nature.

`All test cases must be...`
- Self contained programs that can be executed on their own if necessary
  - This ensures that if you are iterating on a single test case while trying to
    make it pass, you will always have the freedom to run just that one test
    instead of running the full suite of which the execution time will grow
    rapidly as we add test coverage, so, better nip that in the bud with this
    principle.
- Excluded from the public API surface of the package they are in by ensuring
   that the test classes/types/interfaces are NOT exported through the
   `public-api.ts` file of that particular package.
   - The only exception from this is if a package is itself designed for tests
     for which a delightful example is the `test-tooling` package which as the
     name suggests is entirely designated for providing utilities for writing
     tests and therefore in the case of this package it is allowed and even
     expected that it will expose test related classes/types in it's public
     API surface. Do note however that indirectly the principle still applies,
     meaning that any package must not depend on the `test-tooling` package as
     an npm `dependency` but rather it must declare it as a `devDependency` in
     the relevant section of the `package.json` file.
- Compatible with the [TestAnythingProtocol](https://testanything.org/)
  - The NodeJS implementation of said protocol is in the `node-tap` npm package:
  - [Assertions API](https://node-tap.org/docs/api/asserts/) of Node TAP
  - Simplest possible test case:
      ```typescript
      const test, { Test } = require("tape");
      import * as publicApi from "../../../main/typescript/public-api";

      test("Module can be loaded", (t: Test) => {
         t.ok(publicApi);
         t.end(); // yaay, test coverage
      });
      ```
  - An [end to end test case](./packages/cactus-test-plugin-consortium-manual/src/test/typescript/integration/plugin-consortium-manual/security-isolation-via-api-server-ports.ts) showcasing everything in action
  that is being preached in this document about test automation
- Focus/verify a single bug-fix/feature/etc.
- Clearly separated from non-test (aka `main`) source code.
   This means in practice that we ask that your test cases are either in the
   1. `./src/test/...` tree of the package that you are testing OR
   2. your test cases are in the `./src/test/...` tree (yes same name) BUT in an
   entirely separate package if the dependencies necessitate so.
   An example to when you would need a separate testing package is if you are
   developing a ledger plugin that has REST API endpoints shipping with it and
   you wish to verify in a test that the plugin can be loaded to the `ApiServer`
   and then called via the web service/SDK.
   In this case, you cannot place your test case in the ledger plugin's package
   because you want to avoid having to pull in the API server as a dependency
   of your ledger plugin package (to ensure that there will be no circular
   dependencies).
- Executable with unlimited parallelism (so if I have a 128 test cases and run
  all of them in parallel on my new 128 CPU core computer, then every single
  test case runs at the same time)
   - This is important because it weeds out flakyness and hardcoded references
     to shared resources (Remember the rant about network ports in the previous
     section?)
   - *BUT* it is also very important because we (as in humanity) spent the last
     decade making the average CPUs ship with more and more cores as increasing
     frequency failed in the late 2000s as a performance increasing strategy.

     What this means is that to utilize the average consumer laptop that most
     people will have for development, you will need your test cases to run in
     parallel which will save time for everyone working on the code and faster
     turnaround times make for a better developer experience which makes for a
     happier community around our open source project. It's all connected. ;-)
- Test cases don't depend on code outside of the `./src/*` directory trees of
   the packages.
   - Do not depend on any of the example code in your test cases.
   - If you need to import code that is not JS/JSON/TS you can still do so via
     the Typescript compiler's relevant feature that allows importing arbitrary
     files.

## Working with the Code

There are additional details about this in the [BUILD.md](./BUILD.md) file in
the project root as well.

We use Lerna for managing the [monorepo](https://blog.npmjs.org/post/186494959890/monorepos-and-npm) that is Cactus.

> We heavily rely on Docker for testing the ledger plugins.

### Running/Debugging the tests

Make sure to have the build succeed prior to attempting to run the tests.
If you just checked out the project, it is best to just to just run the CI
script which will do a full build and run all tests for you. If it fails
you can open a bug in the issue tracker.

Assuming you have built the sources, below are the different methods to run the
tests:

#### Running a single test case

You execute unit and integration tests in the same way, but here are examples
for both them separately anyway:

  - An integration test:

      ```sh
      npx tap --ts --timeout=600 packages/cactus-test-plugin-consortium-manual/src/test/typescript/integration/plugin-consortium-manual/security-isolation-via-api-server-ports.ts
      ```

  - A unit test:

      ```sh
      npx tap --ts --timeout=600 packages/cactus-common/src/test/typescript/unit/objects/get-all-method-names.ts
      ```

#### Running all test cases (unit+integration)

```sh
npm run test:all
```

#### Running unit tests only

```sh
npm run test:unit
```

#### Running integration tests only

```sh
npm run test:integration
```

#### What is npx used for?

`npx` is a standard top level binary placed on the path by NodeJS at installation time. We use it to avoid having to
place every node module (project dependencies) on the OS path or to install them globally (`npm install some-pkg -g`)

Read more about npx here: https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner

#### Debugging a test case

Open the `.vscode/template.launch.json` file and either copy it with a name of
`launch.json` (if you don't already have such a file) or just cherry pick the
example Visual Studio Code debug tasks that you'd like to use.
For debugging a single test case, you need the debug task from the template
launch.json file that is called `TAP: Current TS Test File`.
Prior to running that debug task you must have your VSCode editor opened to the
test file that you wish to run.
Breakpoints will work as long as you are debugging code in the same package.

> Source map support is partial at this point but actively being worked on.


### All-In-One Docker Images for Ledger Connector Plugins

If you are working on a new ledger connector you'll need an `all-in-one` docker
image as well, which will allow the expected level of test automation. If your
chosen ledger's maintainers provide an adequate docker image, then you might not
need to develop this yourself, but this is rarely the case so YMMV.

To see an existing set of examples for `besu` and `quorum` images take a peek at
the `tools/docker/besu-all-in-one` and `tools/docker/quorum-all-in-one` folders.
These produce the `hyperledger/cactus-besu-all-in-one` and
`hyperledger/cactus-quorum-all-in-one` images respectively. Both of these are
used in the test cases that are written for the specific ledger connector
plugins at:
* `packages/cactus-test-plugin-ledger-connector-quorum/src/test/typescript/integration/plugin-ledger-connector-quorum/deploy-contract/deploy-contract-via-web-service.ts`
* `packages/cactus-plugin-ledger-connector-besu/src/test/typescript/integration/plugin-ledger-connector-besu/deploy-contract/deploy-contract-from-json.ts`

The specific classes that utilize the `all-in-one` images can be found in the
`test-tooling` package under these paths:
* `packages/cactus-test-tooling/src/main/typescript/besu/besu-test-ledger.ts`
* `packages/cactus-test-tooling/src/main/typescript/quorum/quorum-test-ledger.ts`

#### Test Automation of Ledger Plugins

Ledger plugin tests are written the same way as any other test (which is difficult to achieve, but we thrive to get it done).

The only difference between a ledger connector plugin test case and any unit test is that the ledger connector plugin's
test case will pull up a docker container from one of the `all-in-one` images that we maintain as part of Cactus and then
use that `all-in-one-*` container to verify things such as the ability of the ledger connector plugin to deploy a
contract to said ledger.


As a generic best practice, the test cases should never re-use any `all-in-one`
ledger container for the execution of multiple test cases because that will
almost surely lead to flaky/unstable test cases over the long run and needless
complexity, ordering dependencies and so on. It is recommended that if you have
two test cases for a ledger connector plugin, they both pull up a newly created
container from scratch, execute the test scenario and then tear down and delete
the container completely.

An example for a ledger connector plugin and it's test automation implemented the way it is explained above:
`packages/cactus-test-plugin-ledger-connector-quorum/src/test/typescript/integration/plugin-ledger-connector-quorum/deploy-contract/deploy-contract-via-web-service.ts`

> This test case is also an example of how to run an ApiServer independently with a single ledger plugin which is
> how the test case is set up to begin with.

Another option if you want to perform some tests manually is to run the API server with a configuration of your choice:

```sh
# Starting from the project root directory

chmod +x ./packages/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js

./packages/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js --config-file=.config.json
```

You can run this test case the same way you would run any other test case (which is also a requirement in itself for each test case):

```sh
npx tap --ts --timeout=600 packages/cactus-test-plugin-ledger-connector-quorum/src/test/typescript/integration/plugin-ledger-connector-quorum/deploy-contract/deploy-contract-via-web-service.ts
```

You can specify an arbitrary set of test cases to run in a single execution via glob patterns. Examples of these glob
patterns can be observed in the root directory's `package.json` file which has npm scripts for executing all tests with
a single command (the CI script uses these):

```json
"test:all": "tap --ts --jobs=1 --timeout=600 \"packages/cactus-*/src/test/typescript/{unit,integration}/\"",
"test:unit": "tap --ts --timeout=600 \"packages/cactus-*/src/test/typescript/unit/\"",
"test:integration": "tap --ts --jobs=1 --timeout=600 \"packages/cactus-*/src/test/typescript/integration/\""
```

Following a similar pattern if you have a specific folder where your test cases are, you can run everything in that
folder by specifying the appropriate glob patterns (asterisks and double asterisks as necessary depending on the folder
being a flat structure or with sub-directories and tests nested deep within them).

For example this can work as well:

```sh
# Starting from the project root
cd packages/cactus-test-plugin-ledger-connector-quorum/src/test/typescript/integration/plugin-ledger-connector-quorum
npx tap --ts --jobs=1 --timeout=600 \"./\"
```

> Be aware that glob patterns need quoting in some operating system's shell environments and not necessarily on others.
> In the npm scripts Cactus uses we quote all of them to ensure a wider shell compatibility.

### Building the SDK

You do not need to do anything special to have the SDK sources generated and
compiled. It is all part of the `npm run build` task which you can run yourself
or as part of the CI script (`./tools/ci.sh`).

The SDK is itself just another package named `sdk` and can be dependend on by
other packages where applicable.

The SDK is designed to be a universal package meaning that it runs just fine in
browser and also NodeJS environments. This is very important as we do not wish
to maintain two (or more) separate SDK codebases and we also want as much of it
being generated automatically as possible (currently this is close to 100%).

### Adding a new public npm dependency to one of the packages:

For example web3 can be added as a dependency to the besu ledger connector plugin's package this way:

```sh
npx lerna add web3@latest --scope '*/*plugin-ledger-connector-besu' --exact # [--dev] [--peer]
```

If you are adding a development dependency you can use the `--dev` option and `--peer` for a peer dependency.

After running any `lerna add` command you might need to [Reload VSCode Window After Adding Dependencies](#reload-vscode-window-after-adding-dependencies)

### Adding a sibling package npm dependency to one of the packages:

For example the `cactus-test-tooling` can be added as a dev dependency to the besu ledger connector plugin's package this way:

```sh
npx lerna add @hyperledger/cactus-test-tooling --scope '*/*plugin-ledger-connector-besu' --exact --dev
```

Or add the common library to allow you the usage of the logger for example:

```sh
npx lerna add @hyperledger/cactus-common --scope '*/*plugin-ledger-connector-quorum' --exact --dev
```

After running any `lerna add` command you might need to [Reload VSCode Window After Adding Dependencies](#reload-vscode-window-after-adding-dependencies)

### Reload VSCode Window After Adding Dependencies

If you added a new dependency and VSCode is showing an error when you try to
import it, then sometimes the issue is just a matter of nudging VSCode to reload
the Typescript definitions from scratch so that it "notices" the new dependency
you just added.

The recommended way of doing this is by hitting the `F1` key (or whatever you
have bound the command menu to) and then searching and selecting `Developer: Reload Window`
As a simpler alternative you can also just quit and relaunch the VSCode application
of course.

### On Reproducible Builds

As a best practice, any given revision (commit hash) stored in version control should produce the exact same build
artifacts regardless of when or where the build was performed. This can only be achieved if npm dependency versions
are locked  down instead of being automatically upgraded by npm (which makes the build time and machine dependent).

Bottom line: Do not use the the `^`, `~` and `*` syntax elements while declaring your npm dependencies.

Further details:
- https://reproducible-builds.org/
- https://spin.atomicobject.com/2016/12/16/reproducible-builds-npm-yarn/

