import path from "path"
import home from "user-home"
import moment, { Moment } from "moment"

const CONFIG_PATH = path.join(home, ".sand-config")

export interface IFilesystem {
  fileExists(path: string): Promise<boolean>
  readFile(path: string): Promise<string>
  appendFile(path: string, content: string): Promise<void>
  writeFile(path: string, content: string): Promise<void>
  touch(path: string): Promise<void>
}

export enum EntryType { "START", "STOP" }
export interface IEntry {
  rawDate: string
  time: Date
  type: EntryType
  activity: string
}

export interface IStatus {
  time: Date
  activity: string
  duration: Number
}

export default class Sand {
  constructor (private filesystem: IFilesystem) {}

  public async init (filePath: string) {
    if (await this.filesystem.fileExists(CONFIG_PATH))
      throw new Error(`${CONFIG_PATH} already exists. Delete it and try again if you wish to re-initialise.`)

    await this.filesystem.writeFile(CONFIG_PATH, filePath)
    await this.filesystem.touch(filePath)
  }

  public async start (activity: string) {
    if (!activity) throw new Error("An activity must be given")

    const status = await this.status()
    if (status !== null) await this.stop()

    await this.appendLog(`START ${activity}`)
  }

  public async stop () {
    const status = await this.status()
    if (status === null) throw new Error("Nothing is running")

    await this.appendLog("STOP")
  }

  public async status (): Promise<IStatus> {
    const entries = await this.entries()
    if (entries.length === 0) return null

    const lastEntry = this.parseLine(entries[entries.length - 1])
    if (lastEntry.type === EntryType.STOP) return null

    return this.createStatus(lastEntry, moment())
  }

  public async query (q: string): Promise<IStatus[]> {
    const entries = (await this.entries()).map(this.parseLine)

    const matches = (e: IEntry) => {
      return e.activity.includes(q) || e.rawDate.includes(q)
    }

    return entries.reduce((acc, entry, index) => {
      const isStart = entry.type === EntryType.START
      if (!isStart) return acc
      if (!matches(entry)) return acc

      const end = entries[index + 1]
      const endTime = end ? moment(end.time) : moment()
      const status = this.createStatus(entry, endTime)

      return [...acc, status]
    }, [])
  }

  private createStatus (entry: IEntry, endTime: Moment): IStatus {
    const duration = endTime.diff(moment(entry.time))

    return {
      time: entry.time,
      activity: entry.activity,
      duration: duration
    }
  }

  private async entries (): Promise<string[]> {
    const fpath = await this.trackingFilePath()
    const contents = await this.filesystem.readFile(fpath)
    return contents.split("\n").slice(0, -1)
  }

  private async appendLog (contents: string) {
    const fpath = await this.trackingFilePath()
    const time = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss")

    await this.filesystem.appendFile(fpath, `${time} ${contents}\n`)
  }

  private async trackingFilePath () {
    return this.filesystem.readFile(CONFIG_PATH)
  }

  private parseLine (line: string): IEntry {
    const [date, time, type, ...activity] = line.split(" ")
    return {
      rawDate: date,
      time: new Date(`${date} ${time}`),
      type: EntryType[type as keyof typeof EntryType],
      activity: activity.join(" ")
    }
  }
}
