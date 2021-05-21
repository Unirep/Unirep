# Unirep
UniRep is a private and nonrepudiable repuation system. Users can receive positive and negative reputation from attesters, and voluntarily prove that they have at least certain amount of reputation without revealing the exact amount. Moreover, users cannot refuse to receive reputation from an attester.

For more information, refer to the [documentation](https://vivi432.gitbook.io/unirep/)

## Install and build

```
npm install
```

then run

```
npm run build
``` 
to build the circuits

## Test
Test all cli commands
```
npm run test-cli
```

Integration test
```
npm run test
```

To see how to use Unirep with [mongodb](https://www.mongodb.com/), refer to branch [database](https://github.com/vivianjeng/UniRep/tree/database)