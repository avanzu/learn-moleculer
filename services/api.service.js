'use strict'

const ApiGateway = require('moleculer-web')
const { Service, Errors } = require('moleculer')
const { prop, path, pathOr, split, last, compose, always, assocPath, __, tap } = require('ramda')
const nullablePromise = (value) => (value == null ? Promise.reject() : Promise.resolve(value))
const boolToPromise = (value) => (value ? Promise.resolve(value) : Promise.reject())
const bearerTokenOf = compose(boolToPromise, last, split(' '), pathOr('', ['headers', 'authorization']))
const notAuthorized = (message) => new Errors.MoleculerClientError(message)

const authenticateWithBearer = ({ broker, meta }) => (request) =>
    bearerTokenOf(request).then((token) => broker.call('auth.verify', { token }, { meta }))

const authenticateAnonymously = () => ({ id: 'anon-01', username: 'anonymous', roles: ['anonymous'] })
const testAnonymousAccess = ({ auth }) => (auth ? Promise.reject(auth) : Promise.resolve(auth))
const testIsGranted = ({ broker, meta }) => (role) => broker.call('auth.isGranted', { role }, { meta })

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 * @typedef {import('http').IncomingMessage} IncomingRequest Incoming HTTP Request
 * @typedef {import('http').ServerResponse} ServerResponse HTTP Server Response
 */

module.exports = {
    name: 'api',
    mixins: [ApiGateway],

    // More info about settings: https://moleculer.services/docs/0.14/moleculer-web.html
    settings: {
        // Exposed port
        port: process.env.PORT || 3000,
        // Exposed IP
        ip: '0.0.0.0',

        // Global Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
        use: [],

        routes: [
            {
                path: '/api',
                whitelist: ['**'],
                // Route-level Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
                use: [],
                // Enable/disable parameter merging method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
                mergeParams: true,
                // Enable authentication. Implement the logic into `authenticate` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
                authentication: true,
                // Enable authorization. Implement the logic into `authorize` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
                authorization: true,
                // The auto-alias feature allows you to declare your route alias directly in your services.
                // The gateway will dynamically build the full routes from service schema.
                autoAliases: true,
                aliases: {},

                /** 
				 * Before call hook. You can check the request.
				 * @param {Context} ctx 
				 * @param {Object} route 
				 * @param {IncomingRequest} req 
				 * @param {ServerResponse} res 
				 * @param {Object} data
				 * 
				onBeforeCall(ctx, route, req, res) {
					// Set request headers to context meta
					ctx.meta.userAgent = req.headers["user-agent"];
				}, */

                /**
				 * After call hook. You can modify the data.
				 * @param {Context} ctx 
				 * @param {Object} route 
				 * @param {IncomingRequest} req 
				 * @param {ServerResponse} res 
				 * @param {Object} data
				onAfterCall(ctx, route, req, res, data) {
					// Async function which return with Promise
					return doSomething(ctx, res, data);
				}, */

                // Calling options. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Calling-options
                callingOptions: {},

                bodyParsers: {
                    json: {
                        strict: false,
                        limit: '1MB',
                    },
                    urlencoded: {
                        extended: true,
                        limit: '1MB',
                    },
                },

                // Mapping policy setting. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
                mappingPolicy: 'all', // Available values: "all", "restrict"

                // Enable/disable logging
                logging: true,
            },
        ],

        // Do not log client side errors (does not log an error response when the error.code is 400<=X<500)
        log4XXResponses: false,
        // Logging the request parameters. Set to any log level to enable it. E.g. "info"
        logRequestParams: null,
        // Logging the response data. Set to any log level to enable it. E.g. "info"
        logResponseData: null,

        // Serve assets from "public" folder. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Serve-static-files
        assets: {
            folder: 'public',

            // Options to `server-static` module
            options: {},
        },
    },

    methods: {
        /**
         * Authenticate the request. It check the `Authorization` token value in the request header.
         * Check the token value & resolve the user by the token.
         * The resolved user will be available in `ctx.meta.user`
         *
         * PLEASE NOTE, IT'S JUST AN EXAMPLE IMPLEMENTATION. DO NOT USE IN PRODUCTION!
         *
         * @param {Context} ctx
         * @param {Object} route
         * @param {IncomingRequest} req
         * @returns {Promise}
         */
        authenticate: (context, route, request) =>
            Promise.resolve(request)
                .then(authenticateWithBearer(context))
                .catch(authenticateAnonymously)
                .then((user) => (context.meta.user = user)),
        /**
         * Authorize the request. Check that the authenticated user has right to access the resource.
         *
         * PLEASE NOTE, IT'S JUST AN EXAMPLE IMPLEMENTATION. DO NOT USE IN PRODUCTION!
         *
         * @param {Context} ctx
         * @param {Object} route
         * @param {IncomingRequest} req
         * @returns {Promise}
         */
        authorize: (context, route, { $action }) =>
            Promise.resolve($action).then(testAnonymousAccess).catch(testIsGranted(context)),
    },
}
