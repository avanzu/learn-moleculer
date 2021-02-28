'use strict'

const { Service } = require('moleculer')
const axios = require('axios')
const { prop, tap } = require('ramda')
/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = (broker) => {
    const service = new Service(broker, {
        name: 'covid',

        /**
         * Settings
         */
        settings: {
            baseUrl: 'https://covid-api.mmediagroup.fr/v1',
        },

        /**
         * Dependencies
         */
        dependencies: [],

        /**
         * Actions
         */
        actions: {
            cases: {
                params: { country: 'string|length:2' },
                cache: {
                    keys: ['country'],
                },
                handler: ({ params }) =>
                    service.axios({ url: '/cases', params: { ab: params.country } }).then(prop('data')),
            },
            casesByIp: {
                rest: 'GET /by-ip',
                auth: 'anonymous',
                handler: ({ broker, meta }) =>
                    broker
                        .call('geo.fromIp', null, { meta })
                        .then(({ country_code }) => broker.call('covid.cases', { country: country_code }, { meta })),
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
