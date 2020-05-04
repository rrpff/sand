import path from "path"
import home from "user-home"
import Sand, { IFilesystem } from "../src"
import { InMemoryFilesystem, atTime } from "./helpers"

const SAND_CONFIG_PATH = path.join(home, ".sand-config")
const TRACKING_FILE_PATH = path.join(home, "test-time-file")
const TIME_EXAMPLES = ["2020-05-20 01:30:12", "1994-01-01 15:13:12"]

let filesystem: IFilesystem
let sand: Sand
beforeEach(() => {
  filesystem = new InMemoryFilesystem()
  sand = new Sand(filesystem)
})

describe("initialising a tracking file", () => {
  describe("when a config file already exists", () => {
    it("should throw an error", async () => {
      await filesystem.writeFile(SAND_CONFIG_PATH, "")
      expect(sand.init(TRACKING_FILE_PATH)).rejects.toThrow(`${SAND_CONFIG_PATH} already exists. Delete it and try again if you wish to re-initialise.`)
    })
  })

  describe("when a config file does not exist", () => {
    it("should create a config file for the given file", async () => {
      await sand.init(TRACKING_FILE_PATH)
      expect(await filesystem.readFile(SAND_CONFIG_PATH)).toEqual(TRACKING_FILE_PATH)
    })
  })

  describe("when the tracking file already exists", () => {
    it("should leave it alone", async () => {
      await filesystem.writeFile(TRACKING_FILE_PATH, "important logs")
      await sand.init(TRACKING_FILE_PATH)
      expect(await filesystem.readFile(TRACKING_FILE_PATH)).toEqual("important logs")
    })
  })

  describe("when the tracking file does not exist", () => {
    it("should create it", async () => {
      expect(await filesystem.fileExists(TRACKING_FILE_PATH)).toBeFalsy()
      await sand.init(TRACKING_FILE_PATH)
      expect(await filesystem.fileExists(TRACKING_FILE_PATH)).toBeTruthy()
    })
  })
})

describe("starting tracking", () => {
  beforeEach(async () => await sand.init(TRACKING_FILE_PATH))

  it.each(TIME_EXAMPLES)("should append a START line to the tracking file with the correct date and time", async time => {
    await atTime(time, async () => {
      await sand.start("reading the news")

      expect(await filesystem.readFile(TRACKING_FILE_PATH)).toEqual(`${time} START reading the news\n`)
    })
  })

  describe("without an activity", () => {
    it("throws an error", async () => {
      expect(sand.start("")).rejects.toThrow("An activity must be given")
    })
  })

  describe("when an activity is running", () => {
    it("should stop it and start the new one", async () => {
      await atTime("2020-05-04 13:55:12", () => sand.start("drawing"))
      await atTime("2020-05-04 15:55:12", () => sand.start("writing"))

      expect(await filesystem.readFile(TRACKING_FILE_PATH)).toEqual(
        "2020-05-04 13:55:12 START drawing\n" +
        "2020-05-04 15:55:12 STOP\n" +
        "2020-05-04 15:55:12 START writing\n"
      )
    })
  })
})

describe("stopping tracking", () => {
  beforeEach(async () => await sand.init(TRACKING_FILE_PATH))

  describe("when an activity is running", () => {
    it("should append a STOP line to the tracking file with the correct date and time", async () => {
      await atTime("2020-05-04 13:55:12", () => sand.start("jumping for joy"))
      await atTime("2020-05-04 14:55:12", () => sand.stop())

      expect(await filesystem.readFile(TRACKING_FILE_PATH)).toEqual(
        "2020-05-04 13:55:12 START jumping for joy\n" +
        "2020-05-04 14:55:12 STOP\n"
      )
    })
  })

  describe("when an activity is not running", () => {
    it("should throw an error", async () => {
      await sand.start("writing code")
      await sand.stop()
      expect(sand.stop()).rejects.toThrow("Nothing is running")
    })
  })

  describe("when an activity is not running because it's never been used", () => {
    it("should throw an error", async () => {
      expect(sand.stop()).rejects.toThrow("Nothing is running")
    })
  })
})

describe("checking status", () => {
  beforeEach(async () => await sand.init(TRACKING_FILE_PATH))

  describe("when nothing has ever happened", () => {
    it("should return null", async () => {
      expect(await sand.status()).toBeNull()
    })
  })

  describe("when nothing is running", () => {
    it("should return null", async () => {
      await sand.start("texting")
      await sand.stop()
      expect(await sand.status()).toBeNull()
    })
  })

  describe("when something is running", () => {
    it("should return the activity", async () => {
      await atTime("2020-05-04 13:55:12", () => sand.start("drinking tea"))
      await atTime("2020-05-04 13:56:12", async () => {
        expect(await sand.status()).toEqual({
          activity: "drinking tea",
          time: new Date("2020-05-04 13:55:12"),
          duration: 60 * 1000
        })
      })
    })
  })
})

describe("querying entries", () => {
  beforeEach(async () => await sand.init(TRACKING_FILE_PATH))

  describe("when no entries exist", () => {
    it("should return none", async () => {
      expect(await sand.query("testo")).toEqual([])
    })
  })

  describe("when entries with a matching activity exist", () => {
    it("should return them", async () => {
      await atTime("2020-05-04 13:55:12", () => sand.start("running"))
      await atTime("2020-05-04 14:55:12", () => sand.start("swimming"))
      await atTime("2020-05-04 15:55:12", () => sand.start("climbing"))

      expect(await sand.query("swimming")).toEqual([{
        activity: "swimming",
        time: new Date("2020-05-04 14:55:12"),
        duration: 60 * 60 * 1000
      }])
    })

    describe("and it's the last entry", () => {
      it("compares to current time", async () => {
        await atTime("2020-05-04 14:55:12", () => sand.start("swimming"))
        await atTime("2020-05-04 16:55:12", async () => {
          expect(await sand.query("swimming")).toEqual([{
            activity: "swimming",
            time: new Date("2020-05-04 14:55:12"),
            duration: 2 * 60 * 60 * 1000
          }])
        })
      })
    })
  })

  describe("when entries with a matching date exist", () => {
    it("should return them", async () => {
      await atTime("2020-05-03 13:55:12", () => sand.start("running"))
      await atTime("2020-05-04 14:55:12", () => sand.start("swimming"))
      await atTime("2020-05-05 15:55:12", () => sand.start("climbing"))

      expect(await sand.query("2020-05-03")).toEqual([{
        activity: "running",
        time: new Date("2020-05-03 13:55:12"),
        duration: 60 * 60 * 24 * 1000 + 60 * 60 * 1000
      }])
    })

    describe("and it's the last entry", () => {
      it("compares to current time", async () => {
        await atTime("2020-05-04 14:55:12", () => sand.start("swimming"))
        await atTime("2020-05-04 16:55:12", async () => {
          expect(await sand.query("2020-05-04")).toEqual([{
            activity: "swimming",
            time: new Date("2020-05-04 14:55:12"),
            duration: 2 * 60 * 60 * 1000
          }])
        })
      })
    })
  })
})
