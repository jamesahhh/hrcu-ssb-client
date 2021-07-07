var Service = require('node-windows').Service

var svc = new Service({
    name: 'HRCU SSB Service',
    description: 'A Windows service for retrieving information from SSB API',
    script: './index.js',
    env: {
        name: 'NODE_ENV',
        value: 'production',
    },
})

svc.on('install', function () {
    svc.start()
})

svc.on('alreadyinstalled', function () {
    console.log('This service is already installed.')
})

svc.on('start', function () {
    console.log(svc.name + ' started!')
})

svc.install()
