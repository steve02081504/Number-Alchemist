export class replace_able_t {
	replace_data
	constructor() {
		// 返回一个可以被替换的代理对象
		const self = this.replace_data = {
			to: this
		}
		return new Proxy(self, {
			has: (target, prop) => Reflect.has(self.to, prop),
			get: (target, prop, receiver) => {
				let result = Reflect.get(self.to, prop, receiver)
				if (result instanceof Function) return result.bind(self.to)
				return result
			},
			set: (target, prop, value, receiver) => Reflect.set(self.to, prop, value, receiver),
			getPrototypeOf: (target) => Object.getPrototypeOf(self.to),
			setPrototypeOf: (target, proto) => Object.setPrototypeOf(self.to, proto),
			isExtensible: (target) => Object.isExtensible(self.to),
			preventExtensions: (target) => Object.preventExtensions(self.to),
			ownKeys: (target) => Reflect.ownKeys(self.to),
			getOwnPropertyDescriptor: (target, prop) => Object.getOwnPropertyDescriptor(self.to, prop),
			defineProperty: (target, prop, attributes) => Object.defineProperty(self.to, prop, attributes),
			deleteProperty: (target, prop) => Reflect.deleteProperty(self.to, prop)
		})
	}

	/**
	 * 替换当前对象
	 * @param {Object} obj 要替换的对象。
	 */
	replace(obj) {
		if (obj instanceof replace_able_t) obj = obj.get_self()
		if (obj === this) return
		this.get_replaced(obj)
		this.replace_data.to = obj
		obj.did_replace_to(this)
	}

	/**
	 * 获取实际的对象 (use this method externally)
	 * @param {Object} [obj_that_will_be_replaced] (Optional) 要被替换的对象。
	 * @returns {Object} 实际的对象。
	 */
	get_self(obj_that_will_be_replaced) { return this }

	/**
	 * 被替换时触发的函数
	 * @param {Object} obj_that_will_replace_this 将要替换当前对象的对象。
	 */
	get_replaced(obj_that_will_replace_this) {}

	/**
	 * 替换了别的对象时触发的函数
	 * @param {Object} obj_that_was_replaced 被当前对象替换的对象。
	 */
	did_replace_to(obj_that_was_replaced) {}
}
