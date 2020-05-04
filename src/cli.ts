#!/usr/bin/env node

import minimist from "minimist"
import pluralize from "pluralize"
import moment from "moment"
import chalk, { red, yellow, grey, green, magenta } from "chalk"
import Sand from "./"
import Filesystem from "./filesystem"
import { IStatus } from "./interfaces"

const argv = minimist(process.argv.slice(2))
const sand = new Sand(new Filesystem())

const commands = {} as any

commands.init = async () => {
  await sand.init(argv._[1])
}

commands.start = async () => {
  const description = argv._.slice(1).join(" ")
  await sand.start(description)
  console.log(`started ${yellow(description)}`)
}

commands.stop = async () => {
  const status = await sand.stop()
  console.log(`stopped ${yellow(status.activity)} after ${green(moment.duration(status.duration).humanize())}`)
}

commands.status = async () => {
  const status = await sand.status()
  if (status === null) return console.log("currently doing nothing")

  printStatuses([status], false)
}

commands.today = async () => {
  const statuses = await sand.query(moment().format("YYYY-MM-DD"))
  printStatuses(statuses, argv.sum)
}

commands.yesterday = async () => {
  const statuses = await sand.query(moment().subtract(1, "day").format("YYYY-MM-DD"))
  printStatuses(statuses, argv.sum)
}

commands.query = async () => {
  const statuses = await sand.query(argv._.slice(1).join(" "))
  printStatuses(statuses, argv.sum)
}

commands.help = () => console.log(`
${grey("~~~~~~")} sand ${grey("~~~~~~")}

${yellow("To set up for the first time:")}

${grey("$")} cd ${green("<any-directory>")}
${grey("$")} sand init ${green("<your-new-sand-file>")}

${yellow("To start a new activity:")}

${grey("$")} sand start ${green("<describe your activity>")}

${yellow("To stop the current activity:")}

${grey("$")} sand stop

${yellow("To view the current status:")}

${grey("$")} sand status ${grey("[--sum]")}

${yellow("To view a day:")}

${grey("$")} sand today ${grey("[--sum]")}
${grey("$")} sand yesterday ${grey("[--sum]")}
${grey("$")} sand query 2020-05-20 ${grey("[--sum]")}

${yellow("To search:")}
${grey("$")} sand query programming ${grey("[--sum]")}
`)

const displayTime = (time: Date) => moment(time).format("YYYY-MM-DD HH:mm:ss")
const displayDuration = (duration: number) => humanise(moment.duration(duration, "milliseconds"))

const table = (elements: any[], headers: string[], colours: chalk.ChalkFunction[]) => {
  const colour = (str: string, i: number) => colours[i](str)
  return elements.map(elem => headers.map(h => elem[h]).map(colour).join(" ")).join("\n")
}

const humanise = (duration: moment.Duration) => {
  const components = [
    { value: duration.years(), unit: "year" },
    { value: duration.months(), unit: "month" },
    { value: duration.days(), unit: "day" },
    { value: duration.hours(), unit: "hour" },
    { value: duration.minutes(), unit: "minute" },
  ]

  return components.filter(c => c.value !== 0)
    .map(c => pluralize(c.unit, c.value, true))
    .join(", ")
}

const printStatuses = (statuses: IStatus[], sum: boolean) => {
  if (sum)
    console.log(table(sumStatuses(statuses), ["activityType", "activityDescription", "totalDuration"], [magenta, yellow, green]))
  else
    console.log(table(statuses.map(formatStatus), ["time", "activityType", "activityDescription", "duration"], [grey, magenta, yellow, green]))
}

const formatStatus = (status: IStatus) => ({
  activityType: status.activity.split(" ")[0],
  activityDescription: status.activity.split(" ").slice(1).join(" "),
  time: displayTime(status.time),
  duration: displayDuration(status.duration)
})

const sumStatuses = (statuses: IStatus[]) => {
  const summed = statuses.reduce((acc, status) => {
    if (!acc.some(i => i.activity === status.activity))
      return [...acc, { activity: status.activity, totalDuration: status.duration }]

    return acc.map(i => ({ ...i,
      totalDuration: i.activity === status.activity
        ? i.totalDuration + status.duration
        : i.totalDuration
    }))
  }, [])

  return summed.map(s => ({
    activityType: s.activity.split(" ")[0],
    activityDescription: s.activity.split(" ").slice(1).join(" "),
    totalDuration: displayDuration(s.totalDuration)
  }))
}

;(async () => {
  try {
    const [command] = argv._
    if (!command) await commands.help()
    else if (commands[command]) await commands[command]()
    else console.log(red(`${command} is not a command`))
  } catch (e) {
    console.error(red(e))
  }
})()
