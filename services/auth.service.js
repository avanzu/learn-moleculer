'use strict'
const jwt = require('jsonwebtoken')
const { Service, Errors } = require('moleculer')
const { promisify } = require('util')
const { head, compose, assoc, tap, propOr, curry } = require('ramda')
const { MoleculerClientError } = Errors
const fromNullable = (value) => new Promise((resolve, reject) => (value == null ? reject() : resolve(value)))
const fromBoolean = curry(
    (error, value) => new Promise((resolve, reject) => (value ? resolve(value) : compose(reject, error)()))
)
const roleHierarchy = {
    admin: ['admin', 'user', 'anonymous'],
    user: ['user', 'anonymous'],
    anonymous: ['anonymous'],
}

const notAuthorized = () => new MoleculerClientError('Forbidden', 403)
const hasRole = (role) => (user) =>
    propOr([], 'roles', user)
        .reduce((acc, curr) => acc.concat(roleHierarchy[curr]), [])
        .includes(role)

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = (broker) => {
    const service = new Service(broker, {
        name: 'auth',

        /**
         * Settings
         */
        settings: {
            $secureSettings: ['secret'],
            secret: '37Km0Ooltf4oQiDy6hGaHmkN4nH7UzPS',
            expiresIn: '1d',
        },

        /**
         * Dependencies
         */
        dependencies: [],

        /**
         * Actions
         */
        actions: {
            login: {
                rest: '/login',
                params: { username: 'string', password: 'string' },
                handler: ({ params, meta }) =>
                    broker
                        .call('users.findByCredentials', params, { meta })
                        .then((user) => service.generateToken(user).then((token) => ({ token, user }))),
            },
            verify: {
                visibility: 'public',
                params: { token: 'string' },
                handler: ({ params }) => service.verify(params.token, service.settings.secret),
            },
            isGranted: {
                visibility: 'public',
                params: { role: 'string' },
                handler: ({ params, meta }) =>
                    Promise.resolve(meta.user).then(compose(fromBoolean(notAuthorized), hasRole(params.role))),
            },
        },

        /**
         * Events
         */
        events: {},

        /**
         * Methods
         */
        methods: {
            generateToken: ({ _id, roles, username, email }) =>
                service.encode({ id: _id, roles, username, email }, service.settings.secret),
        },

        /**
         * Service created lifecycle event handler
         */
        created() {
            this.encode = promisify(jwt.sign)
            this.verify = promisify(jwt.verify)
        },

        /**
         * Service started lifecycle event handler
         */
        async started() {},

        /**
         * Service stopped lifecycle event handler
         */
        async stopped() {},
    })

    return service
}
