export class replace_able_t {
	#self_data
	constructor() {
		// 返回一个可以被替换的代理对象
		const self = this.#self_data = {
			to: this
		}
		return new Proxy(self, {
			has: (target, prop) => {
				return prop in self.to
			},
			get: (target, prop) => {
				let result = self.to[prop]
				if (result instanceof Function) return result.bind(self.to)
				return result
			},
			set: (target, prop, value) => {
				self.to[prop] = value
				return true
			},
			getPrototypeOf: () => Object.getPrototypeOf(self.to)
		})
	}

	/**
	 * 替换当前对象
	 * @param {Object} obj 要替换的对象。
	 */
	replace(obj) {
		if (obj instanceof replace_able_t) obj = obj.getSelf()
		this.#self_data.to = obj
	}

	/**
	 * 获取实际的对象
	 * @returns {Object} 实际的对象。
	 */
	getSelf() {
		return this.#self_data.to
	}
}
