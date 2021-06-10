'use strict'
const { basename } = require('path')
const { unlink, access, mkdir } = require('fs/promises')
const { watch } = require('chokidar')
const { constants, readFileSync, writeFile } = require('fs')
const soap = require('soap')
const dotenv = require('dotenv')
const { request } = require('http')

dotenv.config()

const log = console.log.bind(console)

const url = process.env.API

checkFor(process.env.IN)
checkFor(process.env.OUT)

soapRequest([], '')

var watcher = watch(process.env.WATCH_DIRECTORY, {
    awaitWriteFinish: {
        stabilityThreshold: 1500,
        pollInterval: 100,
    },
    ignored: /^(?=.*(\.\w+)$)(?!.*(\.txt)$).*$/,
})

//fire event for addition
watcher.on('add', (path) => {
    fileOps(path)
})

function fileOps(path) {
    var array = readFileSync(path).toString('utf-8').split(/\r?\n/)
    var ext = basename(path)
    soapRequest(array, ext)
    removeFile(path)
}

async function checkFor(path) {
    try {
        access(path, constants.R_OK | constants.W_OK)
    } catch (e) {
        log(e)
        await createDirectory(path)
        log(`Created ${path}`)
    }
}

function createDirectory(path) {
    mkdir(path, { recursive: true })
}

async function removeFile(path) {
    try {
        await unlink(path)
    } catch (error) {
        log(error.message)
    }
}

function soapRequest(array, ext) {
    var options = {
        endpoint: process.env.API,
    }
    var requestArgs = decorateArgs(array)
    soap.createClient(url, options, function (err, client) {
        clientSwitch(client, requestArgs, ext)
    })
}

function clientSwitch(client, requestArgs, ext) {
    if (requestArgs.method == 'BusinessNumber') {
        client.ValidateBusinessNumber(requestArgs, function (result) {
            writeToFile(JSON.stringify(result))
        })
    } else {
        client.ValidateReferenceNumber(requestArgs, function (result) {
            writeToFile(JSON.stringify(result))
        })
    }
}

function writeToFile(content, ext) {
    writeFile(`${process.env.OUT}/${ext}`, content, (err) => {
        if (err) {
            console.error(err)
            return
        }
        log(`File ${ext} created in ${process.env.OUT}`)
    })
}

function decorateArgs(array) {
    var args = {
        method: array[0],
    }
    switch (args.method) {
        case 'BusinessNumber': {
            args.BusinessNumber = args[1]
            break
        }
        case 'BusinessNumber': {
            args.ReferenceNumber = args[1]
            break
        }
        default:
            break
    }
    return args
}
