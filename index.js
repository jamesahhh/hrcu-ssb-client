'use strict'
const { basename } = require('path')
const { unlink, access, mkdir } = require('fs/promises')
const { watch } = require('chokidar')
const { constants, readFileSync, writeFile } = require('fs')
const soap = require('soap')
const dotenv = require('dotenv')

dotenv.config({ path: './ssb.env'})

const log = console.log.bind(console)

const url = process.env.API

checkFor(process.env.OUT_LOCATION)
checkFor(process.env.IN_LOCATION)

var watcher = watch(process.env.IN_LOCATION, {
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
        await access(path, constants.R_OK | constants.W_OK)
    } catch (error){
        createDirectory(path)
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
    var requestArgs = decorateArgs(array)
    soap.createClient(url, function (err, client) {
        clientSwitch(client, requestArgs, ext)
    })
}

function clientSwitch(client, requestArgs, ext) {
    if (requestArgs.method == 'ValidateBusinessNumber') {
        client.ValidateBusinessNumber(requestArgs, function (err, result) {
            writeToFile(JSON.stringify(result, null, 4), ext)
        })
    } else {
        client.VerifyReferenceNumber(requestArgs, function (err, result) {
            writeToFile(JSON.stringify(result, null, 4), ext)
        })
    }
}

function writeToFile(content, ext) {
    writeFile(`${process.env.OUT_LOCATION}/${ext}`, content, (err) => {
        if (err) {
            console.error(err)
        }
        log(`File ${ext} created in ${process.env.OUT}`)
    })
}

function decorateArgs(array) {
    var args = {
        method: array[0],
    }
    switch (array[0]) {
        case 'ValidateBusinessNumber': {
            args.BusinessNumber = array[1]
            break
        }
        case 'ValidateReferenceNumber': {
            args.ReferenceNumber = array[1]
            break
        }
        default:
            break
    }
    return args
}
