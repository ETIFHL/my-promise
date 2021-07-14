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
    try{
      fn(this.resolve.bind(this), this.reject.bind(this))
    }catch (e) {
      this.reject(e)
    }
  }

  isFunction(v) {
    return typeof v === 'function';
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  static resolve(value) {
    if(value instanceof MyPromise) {
      return value
    }
    return new MyPromise((resolve) => {
      resolve(value)
    })
  }

  static reject(reason) {
    return new MyPromise((resolve, reject) => {
      reject(reason)
    })
  }

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

  then(onFulfilled, onRejected) {
    const currentOnFulfilled = (typeof onFulfilled === 'function') ? onFulfilled : ((value) => value)
    const currentOnRejected = (typeof onRejected === 'function') ? onRejected : (reason => { throw reason })
    const promise2 = new MyPromise((resolve, reject) => {
      const fulfilledTask = () => {
        queueMicrotask(() => {
          try{
            const x = currentOnFulfilled(this.value)
            this.resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }
      const rejectedTask = () => {
        queueMicrotask(() => {
          try{
            const x = currentOnRejected(this.reason)
            this.resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }
      switch (this.status) {
        case FULFILLED:
          fulfilledTask()
          break;
        case REJECTED:
          rejectedTask()
          break;
        case PENDING:
          this.FULFILLED_CALLBACK_LIST.push(fulfilledTask)
          this.REJECTED_CALLBACK_LIST.push(rejectedTask)
      }
    })
    return promise2
  }

  resolvePromise(promise2, x, resolve, reject) {
    if(promise2 === x) {
      return reject(new TypeError('promise is same as return value'))
    }
    if(x instanceof MyPromise) {
      x.then(y => {
        this.resolvePromise(promise2, y, resolve, reject)
      }, reject)
    } else if(typeof x === 'object' || typeof x === 'function') {
      if(x === null) {
        return resolve(x)
      }
      let then = null
      try{
        then = x.then
      } catch (e) {
        return reject(e)
      }
      if (typeof then === 'function') {
        let called = false
        try {
          then.call(
            x,
            (y) => {
              if(called) return
              called = true
              this.resolvePromise(promise2, y, resolve, reject)
            },
            (r) => {
              if(called) return
              called = true
              reject(r)
            }
          )
        } catch (e) {
          if(called) return
          reject(e)
        }
      } else {
        resolve(x)
      }
    } else {
      resolve(x)
    }
  }

  static deferred() {
    const result = {}
    result.promise = new MyPromise((resolve, reject) => {
      result.resolve = resolve
      result.reject = reject
    })
    return result
  }
}

module.exports = MyPromise
