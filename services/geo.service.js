'use strict'

const { Service } = require('moleculer')
const axios = require('axios')
const { prop } = require('ramda')
/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = (broker) => {
    const service = new Service(broker, {
        name: 'geo',

        /**
         * Settings
         */
        settings: {
            baseUrl: 'https://freegeoip.app',
        },

        /**
         * Dependencies
         */
        dependencies: [],

        /**
         * Actions
         */
        actions: {
            fromIp: {
                // params: { country: 'string|length:2' },
                cache: true,
                rest: 'GET /ip',
                handler: ({ params }) => service.axios({ url: '/json' }).then(prop('data')),
            },
        },

        /**
         * Events
         */
        events: {},

        /**
         * Methods
         */
        methods: {},

        /**
         * Service created lifecycle event handler
         */
        created() {
            this.axios = axios.create({
                baseURL: this.settings.baseUrl,
                timeout: 3000,
            })
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
