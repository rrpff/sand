import { IFilesystem } from "../src/interfaces"

export const atTime = async (time: string, fn: Function) => {
  const spy = jest.spyOn(Date, "now")
  const ts = Date.parse(time)
  spy.mockReturnValue(ts)

  await fn()

  spy.mockRestore()
}

export class InMemoryFilesystem implements IFilesystem {
  private files: Array<{ path: string, contents: string }> = []

  public async fileExists(path: string) {
    return this.files.some(f => f.path === path)
  }

  public async readFile(path: string) {
    return this.files.find(f => f.path === path).contents
  }

  public async appendFile(path: string, contents: string) {
    if (await this.fileExists(path)) {
      this.files = this.files.map(f => ({
        ...f,
        contents: f.path === path ? f.contents + contents : f.contents
      }))
    } else {
      this.files.push({ path, contents })
    }
  }

  public async writeFile(path: string, contents: string) {
    if (await this.fileExists(path)) {
      this.files = this.files.map(f => ({
        ...f,
        contents: f.path === path ? contents : f.contents
      }))
    } else {
      this.files.push({ path, contents })
    }
  }

  public async touch(path: string) {
    if (await this.fileExists(path)) return
    this.files.push({ path, contents: "" })
  }
}
