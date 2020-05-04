import fs from "fs"
import touch from "touch"
import { IFilesystem } from "./interfaces"

const { access, readFile, writeFile, appendFile } = fs.promises

export default class Filesystem implements IFilesystem {
  public async fileExists(path: string) {
    try {
      await access(path, fs.constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  public async readFile(path: string) {
    return await readFile(path, { encoding: "utf-8" })
  }

  public async appendFile(path: string, content: string) {
    await appendFile(path, content)
  }

  public async writeFile(path: string, content: string) {
    await writeFile(path, content)
  }

  public async touch(path: string) {
    await touch(path)
  }
}
