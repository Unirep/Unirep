const unusedVarsCfg = [
    "warn",
    { vars: "all", args: "none", ignoreRestSiblings: false, varsIgnorePattern: "_" },
  ];
  
  module.exports = {
    env: {
      node: true,
      es6: true,
      es2018: true,
      mocha: true,
    },
    plugins: ["simple-import-sort", "sonarjs"],
    extends: ["standard-with-typescript", "plugin:sonarjs/recommended"],
    parserOptions: {
      ecmaVersion: 2020,
    //   sourceType: "module"
    },
    rules: {
      // "ter-indent": [2, {"FunctionDeclaration": {"parameters": "first"}}],
      "import/no-extraneous-dependencies": 0,
      // not sure what happened, figure out later :)
      "@typescript-eslint/no-unused-expressions": "off",
      "sonarjs/no-duplicate-string": "off",
      "import/prefer-default-export": "off",
      "max-classes-per-file": 0,
      "max-len": [
        "error",
        {
          code: 110,
          ignoreTrailingComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
      "no-underscore-dangle": 0,
      "simple-import-sort/imports": "warn",
      "sort-imports": "off",
  
      "no-unused-vars": unusedVarsCfg,
      "@typescript-eslint/no-unused-vars": unusedVarsCfg,
      "@typescript-eslint/restrict-template-expressions": "off",

      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/promise-function-async": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/quotes": "off",
      semi: "off", // required for a proper work
      "@typescript-eslint/semi": ["error", "always"],
      "@typescript-eslint/strict-boolean-expressions": "off",
      "sonarjs/cognitive-complexity": ["error", 16],
    },
  };