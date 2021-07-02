# The manual of auto-testing codes

## Boot method
1. Go to the following directory:
	- `cd /packages`
1. Build packages:
	- `./script-build-packages.sh`

## How to use this sample auto-testing
1. Go to the following directory:
	- `cd /packages`
1. Execute the following command:
	- `npm run test`
	- The sample of result is as the following:
		```
		$ npm run test

		> packages@ test /cactus/packages
		> jest

		jest-haste-map: Haste module naming collision: validatorDriver
		The following files share their name; please adjust your hasteImpl:
			* <rootDir>/ledger-plugin/go-ethereum/validator/unit-test/package.json
			* <rootDir>/ledger-plugin/fabric/validator/unit-test/package.json

		jest-haste-map: Haste module naming collision: connector
		The following files share their name; please adjust your hasteImpl:
			* <rootDir>/ledger-plugin/fabric/validator/src/package.json
			* <rootDir>/ledger-plugin/go-ethereum/validator/src/package.json

		PASS  routing-interface/util/RIFUtil.test.ts (6.513 s)
		[2021-01-01T20:16:44.546] [DEBUG] VerifierBase - ##call : super.setEventListener
		PASS  ledger-plugin/VerifierBase.test.ts (6.832 s)

		Test Suites: 2 passed, 2 total
		Tests:       2 passed, 2 total
		Snapshots:   0 total
		Time:        7.282 s
		Ran all test suites.
		```