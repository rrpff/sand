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
  duration: number
}
