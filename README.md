## Promise 的实现历程

用了那么久 Promise，仔细一想原理实现居然说不出个所以然。

看了看 promise-aplus-spec 后还是觉得要自己实现下，于是照着规范实现了一遍。

实现前有很多问题，做了一遍后就豁然开朗，写一点记录。

##### 记录下
1. state 的单向变化判断下即可。
2. pending 状态时，回调函数不可立即执行，后续处理的方法搞个数组存储。在 state 变化后 for 一下依次调用。
3. then 方法传入的两个参数实质上就是俩回调函数（callback）。
4. then 本身在实现上执行是同步的，回调存起来了等异步操作完成后再按顺序调用。
5. then 返回的是一个新的 promise。
6. 这样对非链式的调用更友好更清晰，也合理。
> ```js
> var promsie = new Promise(resolve => resolve(123))
> var promise2 = promsie.then(data => {
>   console.log(data) // 123
>   return 456
> })
> promise.then(data => console.log(data)) // 还是 123
> promise2.then(data => console.log(data)) // 这就是 456
> ```
7. resolvePromise 就是为了让后续的回调函数参数取到的是一个值，回调肯定不想去自己再处理 Promise 。
8. 规范就是规范，里面各种情况考虑的挺周全，也有为了兼容以前实现的处理。

##### Promise 的其他方法

promise 在实际操作中还是有很多方便的方法去使用。尝试实现了 Promise.all 和 Promise.race。

promise-aplus 里面没有这两个方法的测试用例。

看了下 issue 果然有人提意见，不过回复的信息也很明确。

> This is a test suite for the Promises/A+ spec, which only specifies the minimum needed for interoperability (the then method). If you're interested in a test suite for standard ES2015 promises, test262 is probably what you're interested in.

##### 一转 tc39 的 test262

又有好多新花样，开个新的项目通过实现基础方法来扩展对 js 的认识和基础编码的能力。
