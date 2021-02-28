'use strict'

const { Service, Errors } = require('moleculer')
const bcrypt = require('bcrypt')
const { compose, head, always, tap, curry } = require('ramda')
const DbMixin = require('../mixins/db.mixin')

const { MoleculerClientError } = Errors
const invalidCredentials = () => new MoleculerClientError('Invalid credentials')
const userNotFound = () => new MoleculerClientError('User not found')
const unprocessable = (message) => new MoleculerClientError(message, 422)

const fromNullable = curry(
    (error, value) => new Promise((resolve, reject) => (value == null ? compose(reject, error)() : resolve(value)))
)
const fromBoolean = curry(
    (error, value) => new Promise((resolve, reject) => (value ? resolve(value) : compose(reject, error)()))
)
const assignTo = curry((target, prop, value) => Object.assign(target, { [prop]: value }))

const verifyUniqueUsername = ({ adapter }, username) =>
    adapter
        .count({ query: { username } })
        .then((result) => (result ? Promise.reject(unprocessable('Username already taken')) : result))

const verifyUniqueEmail = ({ adapter }, email) =>
    adapter
        .count({ query: { email } })
        .then((result) => (result ? Promise.reject(unprocessable('email already taken')) : result))

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = (broker) => {
    const service = new Service(broker, {
        name: 'users',

        mixins: [DbMixin('users')],

        settings: {
            fields: ['_id', 'firstName', 'lastName', 'email', 'username'],
            entityValidator: {
                email: { type: 'email' },
                username: { type: 'string', min: 5, trim: true },
            },
        },
        hooks: {
            before: {
                create: ({ params }) =>
                    Promise.all([
                        verifyUniqueEmail(service, params.email),
                        verifyUniqueUsername(service, params.username),
                    ]).then(() => bcrypt.hash(params.password, 14).then(assignTo(params, 'password'))),
            },
        },
        actions: {
            findByCredentials: {
                params: { username: 'string', password: 'string' },
                visibility: 'public',
                handler: ({ params }) =>
                    service.adapter
                        .findOne({ $or: [{ username: params.username }, { email: params.username }] })
                        .then(fromNullable(invalidCredentials))
                        .then((user) => service.comparePassword(params.password, user)),
            },
            me: {
                auth: 'user',
                rest: '/me',
                handler: ({ meta }) => fromNullable(userNotFound, meta.user).then(({ id }) => service.getById(id)),
            },
            create: {
                params: { username: 'string|min:3', password: 'string|min:6', email: 'email' },
            },
            list: { auth: 'admin' },
            get: { auth: 'admin' },
            update: { auth: 'admin' },
            remove: { auth: 'admin' },
        },
        /**
         * Events
         */
        events: {},

        /**
         * Methods
         */
        methods: {
            comparePassword: (plain, { password, ...user }) =>
                bcrypt.compare(plain, password).then(fromBoolean(invalidCredentials)).then(always(user)),

            seedDB: () =>
                bcrypt.hash(process.env.ADMIN_PASSWD, 14).then((passwd) =>
                    service.adapter.insertMany([
                        {
                            firstName: 'System',
                            lastName: 'Admin',
                            email: 'admin@api-7f000001.nip.io',
                            username: process.env.ADMIN_USER,
                            password: passwd,
                            roles: ['admin'],
                        },
                    ])
                ),
        },

        /**
         * Service created lifecycle event handler
         */
        created() {},

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
