const REJECTED = 'rejected'
const FULFILLED = 'fulfilled'
const PENDING = 'pending'

class MyPromise {
  value = null
  reason = null
  status = PENDING

  FULFILLED_CALLBACK_LIST = []
  REJECTED_CALLBACK_LIST = []

  constructor(fn) {
    try {
      // this的指向为当前被实例化的对象，可以拿到 status，value和reason。
      fn(this.resolve.bind(this), this.reject.bind(this))
    } catch (e) {
      this.reject(e)
    }
  }

  isFunction(v) {
    return typeof v === 'function'
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  // Promise.resolve 返回的是一个Promise
  static resolve(value) {
    if (value instanceof MyPromise) {
      return value
    }
    return new MyPromise((resolve) => {
      resolve(value)
    })
  }

  // Promise.reject 也是
  static reject(reason) {
    return new MyPromise((resolve, reject) => {
      reject(reason)
    })
  }

  // 执行后回调resolve
  resolve(value) {
    if (this.status === PENDING) {
      this.value = value
      this.status = FULFILLED

      this.FULFILLED_CALLBACK_LIST.forEach(cb => {
        cb(this.value)
      })
    }
  }

  reject(reason) {
    if (this.status === PENDING) {
      this.reason = reason
      this.status = REJECTED

      this.REJECTED_CALLBACK_LIST.forEach(cb => {
        cb(this.reason)
      })
    }
  }

  /**
   * then(data => {}, e => {}) 一般是这样调用
   * @param onFulfilled
   * @param onRejected
   * @returns {MyPromise}
   */
  then(onFulfilled, onRejected) {
    // 参数如果传递的不是函数，就直接搞一个返回对应值的函数即可
    const currentOnFulfilled = (typeof onFulfilled === 'function') ? onFulfilled : ((value) => value)
    const currentOnRejected = (typeof onRejected === 'function') ? onRejected : (reason => { throw reason })

    // then 返回的是一个新的 promise
    const promise2 = new MyPromise((resolve, reject) => {
      // 事件机制的封装
      const fulfilledTask = () => {
        queueMicrotask(() => {
          try {
            // 外部传入的函数返回值可能是乱七八糟的东西
            const x = currentOnFulfilled(this.value)
            // 统一 resolvePromise 处理一下, 参数为 新的 promise，传入方法的返回值，promise2 的 resolve， promise2 的 reject
            this.resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            // 执行出错了当然 reject
            reject(e)
          }
        })
      }
      // 同上
      const rejectedTask = () => {
        queueMicrotask(() => {
          try {
            const x = currentOnRejected(this.reason)
            this.resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }
      // 当前状态判断下，要是异步操作没搞完，就不急着执行 then 后面的方法，放入一个 callbackList 中
      switch ( this.status ) {
        case FULFILLED:
          fulfilledTask()
          break
        case REJECTED:
          rejectedTask()
          break
        case PENDING:
          this.FULFILLED_CALLBACK_LIST.push(fulfilledTask)
          this.REJECTED_CALLBACK_LIST.push(rejectedTask)
      }
    })
    // 构造完了返回呗，一个新的 Promise
    return promise2
  }

  /**
   * 对返回值做处理，后面的 then 和 catch 之类的 onFulfilled 的参数期望拿到一个 value 而不是 Promise
   *        ↓ 就是它
   * .then(data => {})
   * 统一 resolvePromise 处理一下, 参数为 新的 promise，传入方法的返回值，promise2 的 resolve， promise2 的 reject
   * @param promise2
   * @param x
   * @param resolve
   * @param reject
   * @returns {*}
   */
  resolvePromise(promise2, x, resolve, reject) {
    /**
     * 如果promise2 === x，会造成递归。
     * 像这样瞎搞就会出问题
     * .then 的 onFulfilled 返回的 Promise (这个就是x) 是 .then 生成的 Promise (这个就是Promise2，它被赋值给了aaa)
     * var aaa = Promise.resolve(123).then(function() {
     *   return aaa
     * })
     */
    if (promise2 === x) {
      return reject(new TypeError('promise is same as return value'))
    }
    if (x instanceof MyPromise) {
      // onFulfilled 又返回了一个 Promise，继续 resolve 即可, resolve 和 reject 还是 then 里的 promise2 的。
      x.then(y => {
        this.resolvePromise(promise2, y, resolve, reject)
      }, reject)
    } else if (typeof x === 'object' || typeof x === 'function') {
      // typeof null === 'object' 是一个 feature！
      if (x === null) {
        return resolve(x)
      }
      let then = null
      // 规范这么定的，为了兼容。(有 then 就能当 promise 了吗？)
      try {
        then = x.then
      } catch (e) {
        // 取个值也有能报错，可见 js 的灵活性，Object.defineProperty, proxy 之类的，还有啥奇淫巧技以后想起来再加
        return reject(e)
      }
      if (typeof then === 'function') {
        // 整个 flag 防止重复调用
        let called = false
        try {
          // 终于调用了，当然是由需要resolve的值（x）进行进行后续调用。
          // 不管后续调用几层，最后还是回归至第一次声明的 promise2 的 resolve 来返回。
          then.call(
            x,
            (y) => {
              if (called) return
              // called = true
              this.resolvePromise(promise2, y, resolve, reject)
            },
            (r) => {
              if (called) return
              // called = true
              reject(r)
            }
          )
        } catch (e) {
          // 要是传入的方法执行错了，直接 reject
          if (called) return
          reject(e)
        }
      } else {
        // 不是一个方法，是个值，解析完了，直接 resolve
        resolve(x)
      }
    } else {
      // 不是 promise， 不是 object 和 function，直接返回值, 同上
      resolve(x)
    }
  }

  static deferred() {
    // 提供给 test-suit 的接口
    const result = {}
    result.promise = new MyPromise((resolve, reject) => {
      result.resolve = resolve
      result.reject = reject
    })
    return result
  }
}

/**
 * 实现搞下来，这玩意本质上是一个回调的处理方法。
 * 非异步的话就是普通的链式调用。
 * 异步情况就把后续的逻辑给放到一个回调数组中，等待完成后调用。
 */

module.exports = MyPromise
