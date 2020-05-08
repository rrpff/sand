# sand

a little flat file time tracker

## usage

```
~~~~~~ sand ~~~~~~

To set up for the first time:

$ cd <any-directory>
$ sand init <your-new-sand-file>

To start a new activity:

$ sand start <describe your activity>

To stop the current activity:

$ sand stop

To view the current status:

$ sand status [--sum]

To view a day:

$ sand today [--sum]
$ sand yesterday [--sum]
$ sand query 2020-05-20 [--sum]

To search:
$ sand query programming [--sum]
```

## building locally

```
$ git clone https://github.com/zuren/sand
$ cd sand
$ npm install
$ npm run build
$ npm link
```

Then set up your time tracker file, i.e.

```
$ sand init ~/time-log
```
