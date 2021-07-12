#!/usr/bin/env node

const { getPackageInfoList } = require("./get-package-info-list");

const main = async () => {
  const packageInfoList = await getPackageInfoList([]);

  const errors = [];

  packageInfoList.forEach((pi) => {
    const nameNoScope = pi.name.replace("@hyperledger/", "");

    const targetMain = `dist/${nameNoScope}.node.umd.js`;
    const targetMainMinified = `dist/${nameNoScope}.node.umd.min.js`;
    const targetBrowser = `dist/${nameNoScope}.web.umd.js`;
    const targetBrowserMinified = `dist/${nameNoScope}.web.umd.min.js`;

    const { main, mainMinified, browser, browserMinified } = pi.packageObject;

    const pkgJsonPath = `${pi.location}/package.json`;

    if (targetMain !== main) {
      errors.push(`${pkgJsonPath}: \n\t${targetMain}\n\t${main}\n`);
    }
    if (targetMainMinified !== mainMinified) {
      errors.push(
        `${pkgJsonPath}: \n\t${targetMainMinified}\n\t${mainMinified}\n`
      );
    }
    if (targetBrowser !== browser) {
      errors.push(`${pkgJsonPath}: \n\t${targetBrowser}\n\t${browser}\n`);
    }
    if (targetBrowserMinified !== browserMinified) {
      const diff = `\n\t${targetBrowserMinified}\n\t${browserMinified}\n`;
      const errorMessage = `${pkgJsonPath}: ${diff}`;
      errors.push(errorMessage);
    }
  });

  if (errors.length === 0) {
    console.log(`No errors found. All OK.`);
    process.exit(0);
  } else {
    errors.forEach((e) => console.error(e));
    process.exit(-1);
  }
};

main();
