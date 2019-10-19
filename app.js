let express = require('express')
let path = require('path')
let fs = require('fs')
let baseUrl1 = 'static/upload/type/'
let baseUrl2 = 'static/upload/good/'
let app = new express()
// 引入body-parser
let bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// 设置ejs模板引擎
// app.set('views', __dirname + '/views');

// app.set('view engine','ejs')

// 设置静态目录
app.use(express.static(path.resolve(__dirname, '/static')))
app.use('/static/upload/type', express.static('static/upload/type'))
app.use('/static/upload/good', express.static('static/upload/good'))


//引入图片处理模块
let multiparty = require('multiparty');

// 连接数据库
let mongodb = require('mongodb')
let mongoClient = mongodb.MongoClient
let ObjectId = mongodb.ObjectID
let dbUrl = "mongodb://127.0.0.1:27001/shopMall"
// mongodb 版本    "mongodb": "^2.2.36" 3.X版本方式不同
// mongoClient.connect(dbUrl, { useNewUrlParser: true }, (err, db) => {
//     if (err) throw err;
//     console.log("数据库已创建!");
//     db.close();
// });

// 登陆
app.post('/user/login', (req, res) => {
    res.json({ code: 200, data: { token: "admin-token" } })
})
// 获取用户信息
app.get('/user/info', (req, res) => {
    res.json({
        code: 200, data: {
            roles: ['admin'],
            introduction: 'I am a super administrator',
            avatar: 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif',
            name: '超级管理员'
        }
    })
})
// 退出
app.post('/user/logout', (req, res) => {
    res.json({ code: 200, data: 'success' })
})

// ==========商品分类部分==========
// 展示商品列表
app.get('/type/list', (req, res) => {
    //使用数据库获取当前的类别内容
    mongoClient.connect(dbUrl, function (err, db) {
        db.collection('type').find({}).toArray(function (errs, ress) {
            let listObj = {}
            listObj.code = 200;
            listObj.typeList = ress
            res.json(listObj)

        })
        db.close()
    })
})

// 增加商品分类
app.post('/type/addOne', (req, res) => {
    // 解析图片
    let form = new multiparty.Form();
    form.uploadDir = 'static/upload/type'
    form.parse(req, (error, fields, files) => {
        // 存入数据库
        let size = files.file[0].size
        let addObj = {
            typeName: fields.typeName[0],
            picName: `${baseUrl1}${files.file[0].path.substr(19)}`,
        }
        // console.log(addObj)
        // 如果没有上传图片，删除数据库的无用文件
        if (size == 0) {
            fs.unlink(files.file[0].path, (error) => {
                if (!error) {
                    console.log('无效图片信息已删除')
                    // 重置图片路径信息
                    addObj.picName = 0
                    // 存入数据库
                    mongoClient.connect(dbUrl, function (err, db) {
                        db.collection('type').insert(addObj).then(r => {
                            if (r.result.ok == 1) {
                                res.json({ code: 200 })
                            }
                        })
                        db.close()
                    })
                }
            })
        }
        // 有上传图片，直接插入数据库
        else {
            mongoClient.connect(dbUrl, function (err, db) {
                db.collection('type').insert(addObj).then(r => {
                    if (r.result.ok == 1) {
                        res.json({ code: 200 })
                    }
                })
                db.close()
            })
        }
    })
})

// 删除商品分类
app.get('/type/delOne', (req, res) => {
    mongoClient.connect(dbUrl, function (err, db) {
        let updateObj = {
            "_id": ObjectId(req.query._id)
        }
        let oldPicPath = req.query.picName
        console.log(updateObj, oldPicPath)
        db.collection('type').remove(updateObj).then(r => {
            // 成功删除一条商品分类
            if (r.result.ok == 1) {
                // 如果原数据有图片 删除服务器中的图片资源
                if (oldPicPath) {
                    fs.unlink(oldPicPath, (error) => {
                        if (!error) {
                            console.log('服务器分类图片已删除')
                        }
                    })
                }
                // 重新调去数据库资源，返回新的数据给前端
                db.collection('type').find().toArray(function (errs, ress) {
                    console.log(ress)
                    let listObj = {}
                    listObj.code = 200;
                    listObj.typeList = ress
                    res.json(listObj)
                })
                db.close()
            }
        })
    })
})

// 修改商品分类
app.post('/type/updateOne', (req, res) => {
    // 解析资源
    let form = new multiparty.Form();
    form.uploadDir = 'static/upload/type'
    form.parse(req, (error, fields, files) => {
        // 原分类数据的图片路径
        let { oldPicName } = fields
        let newType = {
            newTypeName: fields.typeName[0],
            _id: ObjectId(fields._id[0]),
            size: files.file[0].size
        }
        // 这个是要删除的零时路径，所有不需要加上baseurl
        let unlinkPicName = files.file[0].path
        // 新数据没有图片信息 删除服务器新产生的无用图片资源
        if (newType.size == 0) {
            // 更新数据的picName使用旧的picName
            newType.newPicName = oldPicName[0] == 0 ? 0 : oldPicName[0]
            console.log(newType.newPicName)
            fs.unlink(unlinkPicName, (error) => {
                if (!error) {
                    console.log('无效图片信息已删除')
                }
            })
        }
        // 新数据有图片信息
        else {
            // 更新数据的picName使用新的路径
            newType.newPicName = `${baseUrl1}${files.file[0].path.substr(19)}`
            console.log(newType.newPicName)
            // 删除服务器旧的分类图片
            fs.unlink(oldPicName[0], (error) => {
                if (!error) {
                    console.log('原分类图片信息已删除')
                }
            })
        }
        // 更新数据库商品分类信息
        mongoClient.connect(dbUrl, function (err, db) {
            // 修改商品分类名称
            db.collection('type').update({ _id: newType._id }, { $set: { typeName: newType.newTypeName, picName: newType.newPicName } }).then(r => {
                if (r.result.ok == 1) {
                    console.log('商品分类信息修改成功')
                    // 重新调去数据库资源，返回新的数据给前端
                    db.collection('type').find({}).toArray(function (errs, ress) {
                        console.log(ress, '重新调取的返回值')
                        let listObj = {}
                        listObj.code = 200;
                        listObj.typeList = ress
                        res.json(listObj)
                    })
                    db.close()
                }
            })

        })
    })
})

// ==========商品详情部分==========
// 展示商品详情
app.get('/good/list', (req, res) => {
    //使用数据库获取当前的类别内容
    mongoClient.connect(dbUrl, function (err, db) {
        db.collection('good').find({}).toArray(function (errs, ress) {
            let listObj = {}
            listObj.code = 200;
            listObj.typeList = ress
            res.json(listObj)
        })
        db.close()
    })
})

// 增加商品
app.post('/good/addGood', (req, res) => {
    // 解析图片
    let form = new multiparty.Form();
    form.uploadDir = 'static/upload/good'
    form.parse(req, (error, fields, files) => {
        // 存入数据库
        let size = files.file[0].size
        let addObj = {
            goodName: fields.goodName[0],
            goodPrice: fields.goodPrice[0],
            goodDesc: fields.goodDesc[0],
            goodStatus: fields.goodStatus[0],
            goodType: fields.goodType[0],
            goodNum: fields.goodNum[0],
            goodPic: `${baseUrl2}${files.file[0].path.substr(19)}`
        }
        // console.log(addObj)
        // 如果没有上传图片，删除数据库的无用文件
        if (size == 0) {
            fs.unlink(files.file[0].path, (error) => {
                if (!error) {
                    console.log('无效图片信息已删除')
                    // 重置图片路径信息
                    addObj.goodPic = 0
                    // 存入数据库
                    mongoClient.connect(dbUrl, function (err, db) {
                        db.collection('good').insert(addObj).then(r => {
                            if (r.result.ok == 1) {
                                res.json({ code: 200 })
                            }
                        })
                        db.close()
                    })
                }
            })
        }
        // 有上传图片，直接插入数据库
        else {
            mongoClient.connect(dbUrl, function (err, db) {
                db.collection('good').insert(addObj).then(r => {
                    if (r.result.ok == 1) {
                        res.json({ code: 200 })
                    }
                })
                db.close()
            })
        }
    })
})

// 删除商品
app.get('/good/delOne', (req, res) => {
    mongoClient.connect(dbUrl, function (err, db) {
        let updateObj = {
            "_id": ObjectId(req.query._id)
        }
        let oldGoodPicPath = req.query.goodPic
        db.collection('good').remove(updateObj).then(r => {
            // 删除数据 
            if (r.result.ok == 1) {
                // 如果原数据有图片 删除服务器中的图片资源
                if (oldGoodPicPath) {
                    fs.unlink(oldGoodPicPath, (error) => {
                        if (!error) {
                            console.log('商品图片已删除')
                        }
                    })
                }
                // 重新调去数据库资源，返回新的数据给前端
                db.collection('good').find().toArray(function (errs, ress) {
                    // console.log(ress)
                    let listObj = {}
                    listObj.code = 200;
                    listObj.goodList = ress
                    res.json(listObj)
                })
                db.close()
            }
        })
    })
})

// 修改商品信息
app.post('/good/updateOne', (req, res) => {
    // 解析资源
    let form = new multiparty.Form();
    form.uploadDir = 'static/upload/good'
    form.parse(req, (error, fields, files) => {
        // console.log(fields,files)
        // 原商品数据的图片路径
        let { oldGoodPic } = fields
        console.log()
        let newGood = {
            newGoodName: fields.goodName[0],
            newGoodNum: fields.goodNum[0],
            newGoodPrice: fields.goodPrice[0],
            newGoodDesc: fields.goodDesc[0],
            newGoodStatus: parseInt(fields.goodStatus[0]),
            newGoodType: fields.goodType[0],
            _id: ObjectId(fields._id[0]),
            newGoodPic: files.file[0].path,
            size: files.file[0].size
        }
        // 这个是要删除的零时路径，所有不需要加上baseurl
        let unlinkGooDPic = files.file[0].path
        // 新数据没有图片信息 删除服务器新产生的无用图片资源
        if (newGood.size == 0) {
            // 更新数据的picName使用旧的picName
            newGood.newGoodPic = oldGoodPic[0] == 0 ? 0 : oldGoodPic[0]
            fs.unlink(unlinkGooDPic, (error) => {
                if (!error) {
                    console.log('无效图片信息已删除')
                }
            })
        }
        // 新数据有图片信息
        else {
            // 更新数据的picName使用新的路径
            newGood.newGoodPic = `${baseUrl2}${files.file[0].path.substr(19)}`
            console.log(newGood.newGoodPic)
            // 删除服务器旧的分类图片
            fs.unlink(oldGoodPic[0], (error) => {
                if (!error) {
                    console.log('原分类图片信息已删除')
                }
            })
        }
        // 更新数据库商品分类信息
        mongoClient.connect(dbUrl, function (err, db) {
            // 修改商品分类名称
            db.collection('good').update({ _id: newGood._id }, {
                $set:
                {
                    goodName: newGood.newGoodName,
                    goodNum: newGood.newGoodNum,
                    goodPic: newGood.newGoodPic,
                    goodDesc: newGood.newGoodDesc,
                    goodStatus: newGood.newGoodStatus,
                    goodType: newGood.newGoodType,
                    goodPrice: newGood.newGoodPrice,
                }
            }).then(r => {
                if (r.result.ok == 1) {
                    console.log('商品分类信息修改成功')
                    // 重新调去数据库资源，返回新的数据给前端
                    db.collection('good').find({}).toArray(function (errs, ress) {
                        console.log(ress, '重新调取的返回值')
                        let listObj = {}
                        listObj.code = 200;
                        listObj.goodList = ress
                        res.json(listObj)
                    })
                    db.close()
                }
            })

        })
    })
})

app.get('/ajax/get',(req,res)=>{
    console.log(req.body)
    let obj={code:200,
        msg:'请求成功'
    }
    res.json(obj)
})
app.listen(8080, '192.168.3.145', () => {
    console.log('服务器正在运行')
})