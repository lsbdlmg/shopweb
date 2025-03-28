const express = require('express');
const sql = require('mssql');
const app = express();
const nodemailer = require('nodemailer');
const config = require('./dbConfig');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cron = require("node-cron");
app.use(express.static(path.join(__dirname, 'public')));
app.use('/chartjs', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/images', express.static('public/images/'));
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({ storage: storage })
//--------------- 尝试连接数据库---------------------
const poolPromise = sql.connect(config).then(pool => {
    return pool;
}).catch(err => {
    console.error('数据库连接失败:', err)
})
async function testConnection() {
    try {
        await sql.connect(config)
    } catch (err) {
        console.error('连接失败:', err)
    }
}
testConnection();
//------------------------------------------------------------
//根据用户画像选择该用户可能喜欢的商品摆在商品展示前面
function getMaxLoveCategory(persona) {
    const sortedCategories = Object.entries(persona)
        .sort((a, b) => b[1].love - a[1].love)
        .slice(0, 2)
    if (sortedCategories[0][1].love == 0) {
        return { status: 0 }
    }
    let conditions = []
    //对具有以下条件的商品优先摆在前面
    sortedCategories.forEach(([category, { paypower }]) => {
        let priceCondition = ''
        if (paypower.includes('low')) {
            priceCondition += `(product.price < 100)`
        }
        if (paypower.includes('medium')) {
            if (priceCondition) priceCondition += ' OR '
            priceCondition += `(product.price BETWEEN 100 AND 500)`
        }
        if (paypower.includes('high')) {
            if (priceCondition) priceCondition += ' OR '
            priceCondition += `(product.price > 500)`
        }
        conditions.push(`(product.category = '${category}' AND (${priceCondition}))`)
    })
    const whereClause = conditions.join(" OR ")
    return { status: 1, whereClause }
}
// 展示商品
app.post('/products', async (req, res) => {
    try {
        const { offset = 0, limit = 40, email } = req.body
        const pool = await poolPromise;
        let searchResult
        if (!email) {
            const searchQuery = `
            SELECT product.*, shopaccount.sname
            FROM product
            JOIN shopaccount ON product.salesperson_email = shopaccount.email
            WHERE status = '1'
            ORDER BY product.id
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
            searchResult = await pool.request()
                .input('offset', offset)
                .input('limit', limit)
                .input('email', email)
                .query(searchQuery)
        }
        else {
            await getuserdata(email)
            const searchQuery3 = `SELECT persona FROM useraccount WHERE email=@email`
            const searchResult3 = await pool.request()
                .input('email', email)
                .query(searchQuery3)
            const persona = JSON.parse(searchResult3.recordset[0].persona)
            const data = getMaxLoveCategory(persona)
            const searchQuery = `
            SELECT product.*, shopaccount.sname 
            FROM product
            JOIN shopaccount ON product.salesperson_email = shopaccount.email
            WHERE status = '1'
            ${data.status == 0 ?
                    `ORDER BY product.id`
                    : `ORDER BY 
                    CASE 
                        WHEN ${data.whereClause} THEN 1
                        ELSE 2
                    END`}
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
            searchResult = await pool.request()
                .input('offset', offset)
                .input('limit', limit)
                .query(searchQuery)
        }
        // 获取商品总数
        const searchQuery2 = `SELECT COUNT(*) AS total FROM product WHERE status = '1'`
        const searchResult2 = await pool.request().query(searchQuery2)
        // 返回数据
        res.json({
            products: searchResult.recordset,
            productslength: searchResult2.recordset[0].total // 获取 COUNT(*) 的值
        })
    } catch (err) {
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//管理员查看待审核商品
app.post('/managershowProduct', async (req, res) => {
    try {
        const { offset = 0, limit = 20 } = req.body // 默认值：offset = 0，limit = 20
        const pool = await poolPromise;
        // 获取分页商品
        let searchQuery = `
        SELECT product.*, shopaccount.sname 
        FROM product
        JOIN shopaccount ON product.salesperson_email = shopaccount.email
        WHERE status = '2'
        ORDER BY product.id
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
        const searchResult = await pool.request()
            .input('offset', offset)
            .input('limit', limit)
            .query(searchQuery)
        // 获取商品总数
        let searchQuery2 = `SELECT COUNT(*) AS total FROM product WHERE status = '2'`
        const searchResult2 = await pool.request().query(searchQuery2)
        // 返回数据
        res.json({
            products: searchResult.recordset,
            productslength: searchResult2.recordset[0].total // 获取 COUNT(*) 的值
        })
    } catch (err) {
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
// 展示商家商品
app.post('/showshopProduct', async (req, res) => {
    try {
        const { offset = 0, limit = 20, email } = req.body // 默认值：offset = 0，limit = 20
        const pool = await poolPromise
        // 获取分页商品
        let searchQuery = `
        SELECT product.*
        FROM product
        WHERE  salesperson_email= @email
        ORDER BY product.id
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
        const searchResult = await pool.request()
            .input('offset', offset)
            .input('limit', limit)
            .input('email', email)
            .query(searchQuery)
        // 获取商品总数
        let searchQuery2 = `SELECT COUNT(*) AS total FROM product WHERE  salesperson_email= @email`
        const searchResult2 = await pool.request()
            .input('email', email)
            .query(searchQuery2)
        // 返回数据
        res.json({
            products: searchResult.recordset,
            productslength: searchResult2.recordset[0].total // 获取 COUNT(*) 的值
        })
    } catch (err) {
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//remark1 商品ID 商家email remark2 搜索内容 remark3 商品类别
//用户在商家主页展示商家商品
app.post('/userinshopshowProduct', async (req, res) => {
    const ip = req.ip
    let transaction
    try {
        const { offset = 0, limit = 20, email, name, salespersonemail } = req.body
        const pool = await poolPromise
        transaction = pool.transaction()
        // 开始事务
        await transaction.begin()
        // 获取分页商品
        let searchQuery = `
        SELECT product.*, shopaccount.sname
        FROM product
        JOIN shopaccount ON product.salesperson_email = shopaccount.email
        WHERE status = '1' AND shopaccount.email=@salespersonemail
        ORDER BY product.id
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
        const searchResult = await transaction.request()
            .input('offset', offset)
            .input('limit', limit)
            .input('salespersonemail', salespersonemail)
            .query(searchQuery)
        // 获取商品总数
        let searchQuery2 = `SELECT COUNT(*) AS total FROM product WHERE status = '1' AND salesperson_email= @salespersonemail`
        const searchResult2 = await transaction.request()
            .input('salespersonemail', salespersonemail)
            .query(searchQuery2)
        // 插入操作记录
        const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'user')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '浏览商家店铺')
            .input('remark1', `商家邮箱:${salespersonemail}`)
            .input('remark2', ``)
            .input('remark3', ``)
            .query(insertQuery)
        //提交事务
        await transaction.commit()
        // 返回数据
        res.json({
            products: searchResult.recordset,
            productslength: searchResult2.recordset[0].total // 获取 COUNT(*) 的值
        })

    } catch (err) {
        if (transaction) {
            await transaction.rollback(); // 回滚事务
        }
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//搜索主页商品
app.post('/searchindexProduct', async (req, res) => {
    let transaction
    try {
        const ip = req.ip
        const { category, email, offset = 0, limit = 20, searchUserinput, name } = req.body
        const pool = await poolPromise
        transaction = pool.transaction()
        // 开始事务
        await transaction.begin()
        // 构造查询语句
        let searchQuery1 = `
        SELECT product.*, shopaccount.sname 
        FROM product
        JOIN shopaccount ON product.salesperson_email = shopaccount.email
        WHERE status = '1'`
        let searchQuery2 = `SELECT COUNT(*) AS total FROM product WHERE status = '1'`
        const request = transaction.request()
        // 如果有搜索关键字，则添加查询条件
        if (searchUserinput && searchUserinput.trim() !== "") {
            searchQuery1 += ` AND product.pname LIKE @searchInput`
            searchQuery2 += ` AND product.pname LIKE @searchInput`
            request.input('searchInput', `%${searchUserinput}%`)
        }
        // 如果分类不是 "全部"，则添加分类筛选
        if (category && category !== "全部") {
            searchQuery1 += ` AND product.category = @category`
            searchQuery2 += ` AND product.category = @category`
            request.input('category', category)
        }
        searchQuery1 += ` ORDER BY product.id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
        request.input('offset', offset)
        request.input('limit', limit)
        // 执行商品查询
        const searchResult1 = await request.query(searchQuery1)
        const searchResult2 = await request.query(searchQuery2)
        // 插入操作日志
        const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'user')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '搜索主页商品')
            .input('remark2', `搜索内容:${searchUserinput}`)
            .input('remark3', `商品类别:${category}`)
            .input('remark1', ``)
            .query(insertQuery)
        // 提交事务
        await transaction.commit()
        // 返回数据
        return res.json({
            success: searchResult1.recordset.length > 0,
            data: searchResult1.recordset,
            productslength: searchResult2.recordset[0].total || 0
        })
    } catch (err) {
        if (transaction) {
            await transaction.rollback() // 回滚事务
        }
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//用户在商家主页搜索主页商品
app.post('/searchuserinshopshowProduct', async (req, res) => {
    let transaction
    try {
        const { category, email, offset = 0, limit = 20, searchUserinput, name, salespersonemail } = req.body
        const pool = await poolPromise
        transaction = pool.transaction()
        await transaction.begin()
        // 查询商品
        let searchQuery1 = `
        SELECT product.*, shopaccount.sname 
        FROM product
        JOIN shopaccount ON product.salesperson_email = shopaccount.email
        WHERE status = '1' AND product.salesperson_email = @salespersonemail`
        let searchQuery2 = `SELECT COUNT(*) AS total FROM product WHERE status = '1' AND product.salesperson_email = @salespersonemail`
        const request = transaction.request()
        // 如果有搜索关键字，则添加查询条件
        if (searchUserinput && searchUserinput.trim() !== "") {
            searchQuery1 += ` AND product.pname LIKE @searchInput`
            searchQuery2 += ` AND product.pname LIKE @searchInput`
            request.input('searchInput', `%${searchUserinput}%`)
        }
        // 如果分类不是 "全部"，则添加分类筛选
        if (category && category !== "全部") {
            searchQuery1 += ` AND product.category = @category`
            searchQuery2 += ` AND product.category = @category`
            request.input('category', category);
        }
        searchQuery1 += ` ORDER BY product.id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
        request.input('offset', offset)
        request.input('limit', limit)
        request.input('salespersonemail', salespersonemail)
        // 执行查询
        const searchResult1 = await request.query(searchQuery1)
        const searchResult2 = await request.query(searchQuery2)
        // 插入操作日志
        const ip = req.ip;
        const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'user')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '搜索商家店铺内商品')
            .input('remark1', `商家邮箱:${salespersonemail}`)
            .input('remark2', `搜索内容:${searchUserinput}`)
            .input('remark3', `商品类别:${category}`)
            .query(insertQuery)
        await transaction.commit()
        return res.json({
            success: searchResult1.recordset.length > 0,
            data: searchResult1.recordset,
            productslength: searchResult2.recordset[0].total || 0
        })
    } catch (err) {
        if (transaction) {
            await transaction.rollback()
        }
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//商家搜索店铺商品
app.post('/searchshopProduct', async (req, res) => {
    let transaction
    try {
        const { category, email, offset = 0, limit = 20, searchUserinput, name } = req.body
        const pool = await poolPromise;
        transaction = pool.transaction()
        await transaction.begin()
        // 查询商品
        let searchQuery1 = `
        SELECT product.* 
        FROM product 
        WHERE salesperson_email = @email`
        let searchQuery2 = `
        SELECT COUNT(*) AS total 
        FROM product 
        WHERE salesperson_email = @email`
        const request = transaction.request()
        request.input('email', email)
        // 如果有搜索关键字，则添加查询条件
        if (searchUserinput && searchUserinput.trim() !== "") {
            searchQuery1 += ` AND product.pname LIKE @searchInput`
            searchQuery2 += ` AND product.pname LIKE @searchInput`
            request.input('searchInput', `%${searchUserinput}%`)
        }
        // 如果分类不是 "全部"，则添加分类筛选
        if (category && category !== "全部") {
            searchQuery1 += ` AND product.category = @category`
            searchQuery2 += ` AND product.category = @category`
            request.input('category', category);
        }
        searchQuery1 += ` ORDER BY product.id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
        request.input('offset', offset)
        request.input('limit', limit)
        // 执行查询
        const searchResult1 = await request.query(searchQuery1)
        const searchResult2 = await request.query(searchQuery2)
        // 插入操作日志
        const ip = req.ip
        const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'shop')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '搜索商家店铺内商品')
            .input('remark1', '')
            .input('remark2', `搜索内容:${searchUserinput}`)
            .input('remark3', `商品类别:${category}`)
            .query(insertQuery)
        await transaction.commit()
        return res.json({
            success: searchResult1.recordset.length > 0,
            data: searchResult1.recordset,
            productslength: searchResult2.recordset[0].total || 0
        })
    } catch (err) {
        if (transaction) {
            await transaction.rollback()
        }
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//用户导航栏
app.post('/usernav', async (req, res) => {
    const { Email } = req.body
    try {
        const pool = await poolPromise
        const searchQuery = `SELECT umoney FROM useraccount WHERE email = @Email`
        const result = await pool.request()
            .input('Email', Email)
            .query(searchQuery)
        if (result.recordset.length > 0) {
            return res.json({
                success: true,
                data: result.recordset[0]
            })
        } else {
            return res.json({ success: false })
        }
    } catch (err) {
        console.error('查询失败:', err)
        return res.status(500).json({ success: false })
    }
})
//用户注册插入
app.post('/Userregister', async (req, res) => {
    let transaction
    try {
        const { email, password, name } = req.body
        const pool = await poolPromise
        transaction = pool.transaction()
        await transaction.begin()
        const insertUserQuery = `
            INSERT INTO useraccount (email, pwd, umoney, uname) 
            VALUES (@email, @password, 100000, @name)`
        const request = transaction.request()
        request.input('email', email)
        request.input('password', password)
        request.input('name', name)
        const result = await request.query(insertUserQuery)
        if (result.rowsAffected[0] > 0) {
            const ip = req.ip
            const insertLogQuery = `
                INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
                VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
            await transaction.request()
                .input('who', 'user')
                .input('email', email)
                .input('name', name)
                .input('ip', ip)
                .input('time', new Date().toLocaleString())
                .input('operation', '用户注册')
                .input('remark1', '')
                .input('remark2', '')
                .input('remark3', '')
                .query(insertLogQuery)
            await transaction.commit()
            return res.json({
                success: true,
                message: '注册成功'
            })
        } else {
            await transaction.rollback()
            return res.json({ success: false, message: '注册失败' })
        }
    } catch (err) {
        if (transaction) {
            await transaction.rollback()
        }
        console.error('注册失败:', err)
        return res.status(500).json({ success: false, message: '注册失败' })
    }
})

//---------------用户or管理员or商家登陆检测--------------------------------
app.post('/Userlogin', async (req, res) => {
    let transaction
    try {
        const { Email, Password } = req.body
        const pool = await poolPromise
        const searchQuery = `SELECT uname FROM useraccount WHERE email = @Email AND pwd = @Password`
        const userRequest = pool.request()
        userRequest.input('Email', Email)
        userRequest.input('Password', Password)
        const result = await userRequest.query(searchQuery)
        if (result.recordset.length > 0) {
            transaction = pool.transaction()
            await transaction.begin()
            const ip = req.ip
            const insertLogQuery = `
                INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
                VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
            await transaction.request()
                .input('who', 'user')
                .input('email', Email)
                .input('name', result.recordset[0].uname)
                .input('ip', ip)
                .input('time', new Date().toLocaleString())
                .input('operation', '用户登录')
                .input('remark1', '')
                .input('remark2', '')
                .input('remark3', '')
                .query(insertLogQuery)
            await transaction.commit()
            return res.json({
                success: true,
                data: result.recordset[0]
            })
        } else {
            return res.json({ success: false, message: '用户名或密码错误' })
        }
    } catch (err) {
        if (transaction) {
            await transaction.rollback()
        }
        console.error('查询失败:', err)
        return res.status(500).json({ success: false, message: '登录失败，请稍后再试' })
    }
})
app.post('/ShopOrManagerlogin', async (req, res) => {
    let transaction
    try {
        const { Email, Password } = req.body
        const pool = await poolPromise
        const searchQuery = `
            SELECT sname, email, who FROM shopaccount 
            WHERE email = @Email AND pwd = @Password`
        const userRequest = pool.request()
        userRequest.input('Email', Email)
        userRequest.input('Password', Password)
        const result = await userRequest.query(searchQuery)
        if (result.recordset.length > 0) {
            let role = result.recordset[0].who == 2 ? 'shop' : 'manager'
            const ip = req.ip
            transaction = pool.transaction()
            await transaction.begin()
            const insertLogQuery = `
                INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
                VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
            await transaction.request()
                .input('who', role)
                .input('email', Email)
                .input('name', result.recordset[0].sname)
                .input('ip', ip)
                .input('time', new Date().toLocaleString())
                .input('operation', role === 'shop' ? '商家登录' : '管理员登录')
                .input('remark1', '')
                .input('remark2', '')
                .input('remark3', '')
                .query(insertLogQuery)
            await transaction.commit()
            return res.json({
                success: true,
                message: '登录成功',
                data: result.recordset[0]
            })
        } else {
            return res.json({ success: false, message: '请联系管理员获取正确的账号密码' })
        }
    } catch (err) {
        if (transaction) {
            await transaction.rollback()
        }
        console.error('查询失败:', err)
        return res.status(500).json({ success: false, message: '服务器错误' })
    }
})
app.post('/logout', async (req, res) => {
    const pool = await poolPromise;
    const transaction = pool.transaction()
    await transaction.begin()
    try {
        const { email, name, who } = req.body
        const ip = req.ip
        const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', who)
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '退出登录')
            .input('remark1', '')
            .input('remark2', '')
            .input('remark3', '')
            .query(insertQuery)
        await transaction.commit()
        await getuserdata(email)
    } catch (err) {
        await transaction.rollback()
        console.error('查询失败:', err)
    }
})
//----------------发送验证码-----------------------------
app.post('/sendcode', (req, res) => {
    const userEmail = req.body.email
    const Code = GCode()
    // 发送验证码到用户邮箱
    sendEmail(userEmail, Code)
    res.json({ success: true, Code: Code })
})
//邮箱是否使用
app.post('/isEmailUsed', async (req, res) => {
    const email = req.body.email
    try {
        searchType = `select * from useraccount where email=@email`
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', email)
            .query(searchType)
        // 检查查询结果
        if (result.recordset.length > 0) {
            return res.json({
                success: true,
                message: '邮箱已被使用'
            })
        } else {
            return res.json({ success: false, message: '未使用该邮箱' })
        }
    } catch (err) {
        console.error('查询失败:', err);
        return res.status(500).json({ success: false, message: '查询失败' })
    }
})
// 创建邮件发送者
let transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',  // QQ 邮箱的 SMTP 地址
    port: 465,            // QQ 邮箱的 SMTP 端口（SSL 端口）
    secure: true,         // 使用 SSL
    auth: {
        user: '2501995333@qq.com',   // 你的 QQ 邮箱地址
        pass: 'zvjkwsloxgtwdige',  // QQ 邮箱的授权码
    }
})
// 生成6位随机验证码
function GCode() {
    return Math.floor(100000 + Math.random() * 900000).toString() // 生成6位数字验证码
}
// 发送验证码邮件的函数
function sendEmail(Email, code) {
    let mailOptions = {
        from: '2501995333@qq.com',  // 发送者邮箱
        to: Email,         // 接收者邮箱
        subject: '注册验证码',        // 邮件标题
        text: `您的验证码是: ${code}`, // 邮件内容
    }
    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            return
        }
    })
}
//-------------------------单独展示商品----------------------------------------
//展示单个商品
app.post('/showoneProduct', async (req, res) => {
    try {
        const { proID, email, name } = req.body
        const pool = await poolPromise
        const searchQuery = `
        SELECT product.*, shopaccount.sname FROM product
        JOIN shopaccount on product.salesperson_email=shopaccount.email
        WHERE id=@proID`
        const searchResult = await pool.request()
            .input('proID', proID)
            .query(searchQuery)
        if (searchResult.recordset.length > 0) {
            return res.json({
                success: true,
                data: searchResult.recordset[0]
            })
        } else {
            return res.json({ success: false })
        }
    } catch (err) {
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//页面进入时查询是否购物车已有该商品
app.post('/searchThisIFincart', async (req, res) => {
    const { proID, email } = req.body;
    try {
        const pool = await poolPromise
        const searchQuery = `SELECT * FROM paycart WHERE id = @proID AND useremail = @email`
        const searchResult = await pool.request()
            .input('proID', proID)
            .input('email', email)
            .query(searchQuery)
        if (searchResult.recordset.length > 0) {
            return res.json({ success: true })
        }
    } catch (error) {
        console.error('数据库操作失败:', error)
        return res.status(500).json({ success: false, status: 1, message: '网络异常' })
    }
})
//商品加入购物车
app.post('/ADDcart', async (req, res) => {
    const { name, proID, email } = req.body
    const pool = await poolPromise
    const transaction = await pool.transaction()
    try {
        await transaction.begin()
        // 先查询购物车是否已有该商品
        const searchQuery = `SELECT * FROM paycart WHERE id = @proID AND useremail = @email`
        const searchResult = await transaction.request()
            .input('proID', proID)
            .input('email', email)
            .query(searchQuery)
        if (searchResult.recordset.length > 0) {
            await transaction.commit()
            return res.json({ success: false, status: 2, message: '该商品已在购物车' })
        }
        const searchQuery2 = `SELECT category FROM product WHERE id=@proID`
        const searchResult2 = await transaction.request()
            .input('proID', proID)
            .query(searchQuery2)
        const category = searchResult2.recordset[0].category
        // 不在购物车，执行插入操作
        const insertQuery = `INSERT INTO paycart (id, count, useremail) VALUES (@proID, 1, @email)`
        const insertResult = await transaction.request()
            .input('proID', proID)
            .input('email', email)
            .query(insertQuery)
        if (insertResult.rowsAffected[0] > 0) {
            const ip = req.ip;
            const insertLogQuery = `
                INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
                VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
            await transaction.request()
                .input('who', 'user')
                .input('email', email)
                .input('name', name)
                .input('ip', ip)
                .input('time', new Date().toLocaleString())
                .input('operation', '商品加入购物车')
                .input('remark1', `商品ID:${proID}`)
                .input('remark2', '')
                .input('remark3', `商品类别:${category}`)
                .query(insertLogQuery)
            await transaction.commit()
            return res.json({ success: true, message: '加入购物车成功' })
        }
        await transaction.rollback()
        return res.json({ success: false, status: 0, message: '加入购物车失败' })
    } catch (error) {
        await transaction.rollback()
        console.error('数据库操作失败:', error)
        return res.status(500).json({ success: false, status: 1, message: '网络异常' })
    }
})
//点击立即购买，返回商品数据显示购买弹窗
app.post('/ClickBUYproductNOW', async (req, res) => {
    const { proID, email } = req.body
    try {
        const pool = await poolPromise
        const searchQuery = `
            SELECT p.pname, p.price, p.image_url, p.stock, u.umoney 
            FROM product p
            JOIN useraccount u ON u.email = @email
            WHERE p.id = @proID`
        const result = await pool.request()
            .input('proID', proID)
            .input('email', email)
            .query(searchQuery)
        if (result.recordset.length > 0) {
            return res.json({ success: true, data: result.recordset[0], message: '' })
        } else {
            return res.json({ success: false, message: '商品信息发生变动，请刷新页面' })
        }
    } catch (error) {
        console.error('查询商品信息失败:', error.message)
        return res.status(500).json({ success: false, message: '网络异常' })
    }
})
//发起交易
app.post('/BuyModalClickBuyButton', async (req, res) => {
    const { proID, email, pname, image_url, price, category, count } = req.body
    try {
        const pool = await poolPromise
        const transaction = pool.transaction()
        await transaction.begin()
        // 1. 检查商品信息是否发生变动
        const productQuery = `
            SELECT stock, umoney, uname FROM product 
            JOIN useraccount ON useraccount.email = @email 
            WHERE product.id = @proID AND product.pname = @pname 
            AND product.price = @price AND product.category = @category 
            AND product.status = '1'`
        const productResult = await transaction.request()
            .input('proID', proID)
            .input('pname', pname)
            .input('price', price)
            .input('category', category)
            .input('email', email)
            .query(productQuery)
        if (productResult.recordset.length === 0) {
            await transaction.rollback()
            return res.json({ success: false, status: 2, message: '商品信息出现变动，请刷新页面' })
        }
        const { stock, umoney, uname } = productResult.recordset[0]
        // 2. 检查库存是否足够
        if (stock < count) {
            await transaction.rollback()
            return res.json({ success: false, status: 3, message: '库存不足' })
        }
        // 3. 检查用户余额是否足够
        const totalCost = parseFloat(count) * price
        if (umoney < totalCost) {
            await transaction.rollback()
            return res.json({ success: false, status: 4, message: '余额不足' })
        }
        // 4. 生成订单号
        const orderId = `${Date.now()}${Math.floor(Math.random() * 1000)} `
        const orderTime = new Date().toLocaleString()
        // 5. 插入订单（用户 & 商家）
        const orderQuery = `
            INSERT INTO userOrder(OrderId, id, price, count, Ordertime, image_url, pname, category, useremail)
        VALUES(@OrderId, @proID, @price, @count, @Ordertime, @image_url, @pname, @category, @useremail);
            INSERT INTO shopOrder(OrderId, id, price, count, Ordertime, image_url, pname, category, useremail)
        VALUES(@OrderId, @proID, @price, @count, @Ordertime, @image_url, @pname, @category, @useremail);`
        await transaction.request()
            .input('OrderId', orderId)
            .input('proID', proID)
            .input('price', price)
            .input('count', count)
            .input('Ordertime', orderTime)
            .input('image_url', image_url)
            .input('pname', pname)
            .input('category', category)
            .input('useremail', email)
            .query(orderQuery)
        // 6. 更新用户余额
        const newBalance = umoney - totalCost
        const updateUserQuery = `UPDATE useraccount SET umoney = @newBalance WHERE email = @email`
        await transaction.request()
            .input('newBalance', parseFloat(newBalance).toFixed(2))
            .input('email', email)
            .query(updateUserQuery)
        // 7. 更新库存
        const newStock = stock - count
        let updateStockQuery
        if (newStock <= 0) { updateStockQuery = `UPDATE product SET stock = @newStock,status ='0' WHERE id = @proID` }
        else { updateStockQuery = `UPDATE product SET stock = @newStock WHERE id = @proID` }
        await transaction.request()
            .input('newStock', newStock)
            .input('proID', proID)
            .query(updateStockQuery)
        //插入日志
        const ip = req.ip
        const insertLogQuery = `
                INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
                VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'user')
            .input('email', email)
            .input('name', uname)
            .input('ip', ip)
            .input('time', orderTime)
            .input('operation', '购买商品')
            .input('remark1', `商品ID:${proID}`)
            .input('remark2', `商品数量:${count}`)
            .input('remark3', `商品类别:${category}`)
            .query(insertLogQuery)
        // 8. 提交事务
        await transaction.commit()
        return res.json({ success: true, stock: newStock, message: '购买商品成功' })
    } catch (error) {
        await transaction.rollback()
        console.error('数据库操作失败:', error.message)
        return res.status(500).json({ success: false, status: 1, message: '网络异常' })
    }
})
//记录停留时长
app.post('/productstaytime', async (req, res) => {
    const { proID, email, name, staytime } = req.body
    if (!proID) return res.status(400).json({ success: false, message: '商品ID不能为空' })
    const pool = await poolPromise
    const transaction = pool.transaction()
    try {
        await transaction.begin()
        // 1. 获取商品类别
        const searchQuery = `SELECT category FROM product WHERE id = @proID`
        const searchResult = await transaction.request()
            .input('proID', proID)
            .query(searchQuery)
        if (searchResult.recordset.length === 0) {
            await transaction.rollback()
            return res.status(404).json({ success: false, message: '商品不存在' })
        }
        const category = searchResult.recordset[0].category
        const ip = req.ip
        // 2. 插入操作日志
        const insertQuery = `
            INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
            VALUES (@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'user')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '商品停留时长')
            .input('remark1', `商品ID:${proID}`)
            .input('remark2', `停留时长:${staytime}`)
            .input('remark3', `商品类别:${category}`)
            .query(insertQuery)
        // 3. 提交事务
        await transaction.commit()
        return res.json({ success: true, message: '记录停留时长成功' })
    } catch (error) {
        await transaction.rollback()
        console.error('数据库操作失败:', error)
        return res.status(500).json({ success: false, message: '网络异常' })
    }
})

//-------------------------用户历史订单----------------------------------------
//展示用户历史订单
app.post('/showUserorder', async (req, res) => {
    const { email, name } = req.body
    if (!email) return res.status(400).json({ success: false, message: '邮箱不能为空' })
    const pool = await poolPromise
    const transaction = pool.transaction()
    try {
        await transaction.begin()
        const searchQuery = `SELECT * FROM userOrder WHERE useremail = @email ORDER BY OrderId DESC`
        const searchResult = await transaction.request()
            .input('email', email)
            .query(searchQuery)
        const ip = req.ip;
        const insertQuery = `
                INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
                VALUES (@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'user')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '查看历史订单')
            .input('remark1', '')
            .input('remark2', '')
            .input('remark3', '')
            .query(insertQuery)
        await transaction.commit()
        return res.json({
            success: true,
            data: searchResult.recordset
        })
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//不同状态的订单数据
app.post('/checkorderfetch', async (req, res) => {
    const { email, status, name } = req.body
    const pool = await poolPromise
    const transaction = pool.transaction()
    try {
        await transaction.begin()
        const searchQuery = `SELECT * FROM userOrder WHERE useremail = @email and status = @status ORDER BY OrderId DESC`
        const searchResult = await transaction.request()
            .input('email', email)
            .input('status', status)
            .query(searchQuery)
        const ip = req.ip
        const insertQuery = `
            INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
            VALUES (@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'user')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', `查看${status == 1 ? '待收货' : '待发货'}订单`)
            .input('remark1', '')
            .input('remark2', '')
            .input('remark3', '')
            .query(insertQuery)
        await transaction.commit()
        return res.json({
            success: true,
            data: searchResult.recordset
        })
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err);
        res.status(500).send('数据库查询失败');
    }
})
//搜索订单
app.post('/searchorder', async (req, res) => {
    const { category, email, searchUserinput, name } = req.body
    const pool = await poolPromise
    const transaction = pool.transaction()
    try {
        await transaction.begin()
        let searchQuery = `SELECT * FROM userOrder WHERE useremail = @email`
        // 根据用户输入构建查询条件
        if (searchUserinput) { searchQuery += ` AND( OrderId LIKE '%${searchUserinput}%' or pname LIKE '%${searchUserinput}%')` }
        // 添加分类筛选（如果 category 不是 '全部' 才加条件）
        if (category && category !== "全部") { searchQuery += ` AND category = @category` }
        const request = transaction.request()
            .input('email', email)
        if (category && category !== "全部") { request.input('category', category) }
        searchQuery += ` ORDER BY OrderId DESC`
        const searchResult = await request.query(searchQuery)
        const ip = req.ip
        const insertQuery = `
            INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
            VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'user')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '搜索订单')
            .input('remark1', ``)
            .input('remark2', `搜索内容:${searchUserinput}`)
            .input('remark3', `商品类别:${category}`)
            .query(insertQuery)
        await transaction.commit()
        return res.json({
            success: searchResult.recordset.length > 0,
            data: searchResult.recordset
        })
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err);
        res.status(500).send('数据库查询失败')
    }
})
//用户删除历史订单
app.post('/deleteorder', async (req, res) => {
    try {
        const { email, name, OrderId } = req.body
        const pool = await poolPromise
        const deleteQuery = `DELETE FROM userOrder OUTPUT DELETED.OrderId WHERE OrderId = @OrderId`
        const deleteResult = await pool.request()
            .input('OrderId', OrderId)
            .query(deleteQuery)
        if (deleteResult.recordset.length === 0) {
            return res.json({ success: false, message: '订单不存在或已删除' })
        }
        return res.json({ success: true, message: '订单已被删除' })
    } catch (error) {
        console.error('数据库操作失败:', error.message)
        return res.status(500).json({ success: false, message: '网络异常，请稍后再试' })
    }
})
//-------------------------用户购物车----------------------------------------
//展示用户购物车
app.post('/showUsercart', async (req, res) => {
    const pool = await poolPromise
    const transaction = pool.transaction()
    try {
        const { email, name } = req.body
        await transaction.begin()
        const searchQuery = `SELECT product.*, paycart.count, shopaccount.sname FROM product 
        JOIN paycart ON paycart.id = product.id
        JOIN shopaccount ON product.salesperson_email = shopaccount.email
        WHERE paycart.useremail = @email`
        const searchResult = await transaction.request()
            .input('email', email)
            .query(searchQuery)
        const ip = req.ip;
        const insertQuery = `
            INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
            VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'user')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '查看购物车')
            .input('remark1', ``)
            .input('remark2', ``)
            .input('remark3', ``)
            .query(insertQuery)
        await transaction.commit()
        return res.json({
            success: true,
            data: searchResult.recordset
        })
    } catch (err) {
        // 回滚事务
        await transaction.rollback()
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//用户删除购物车
app.post('/deletecart', async (req, res) => {
    try {
        const { email, name, proID } = req.body
        const pool = await poolPromise
        const deleteQuery = `DELETE FROM paycart WHERE id = @proID and useremail = @email`
        const deleteResult = await pool.request()
            .input('proID', proID)
            .input('email', email)
            .query(deleteQuery)
        if (deleteResult.rowsAffected[0] === 0) {
            return res.json({ success: false, message: '购物车商品不存在或已删除' })
        }
        return res.json({ success: true, message: '购物车商品已被删除' })
    } catch (error) {
        console.error('数据库操作失败:', error.message)
        return res.status(500).json({ success: false, message: '网络异常，请稍后再试' })
    }
})
//搜索购物车商品
app.post('/searchcart', async (req, res) => {
    try {
        const { category, email, searchUserinput, name } = req.body
        const pool = await poolPromise
        let searchQuery = `SELECT product.*, paycart.count, shopaccount.sname FROM product 
        JOIN paycart ON paycart.id = product.id
        JOIN shopaccount ON product.salesperson_email = shopaccount.email
        WHERE paycart.useremail = @email`
        const request = pool.request()
        request.input('email', email)
        // 如果有搜索关键字，则添加查询条件
        if (searchUserinput && searchUserinput.trim() !== "") {
            searchQuery += ` AND product.pname LIKE @searchInput`
            request.input('searchInput', `% ${searchUserinput}% `)
        }

        // 如果分类不是 "全部"，则添加分类筛选
        if (category && category !== "全部") {
            searchQuery += ` AND product.category = @category`
            request.input('category', category)
        }
        const searchResult = await request.query(searchQuery)
        return res.json({
            success: searchResult.recordset.length > 0,
            data: searchResult.recordset
        })

    } catch (err) {
        console.error('查询错误:', err);
        res.status(500).send('数据库查询失败')
    }
})
//更新购物车商品
app.post('/updateCart', async (req, res) => {
    const pool = await poolPromise
    const transaction = pool.transaction()
    try {
        const { proID, email, count, name } = req.body
        if (isNaN(count)) { return res.status(400).json({ success: false, message: '请输入合理的商品数量' }) }
        await transaction.begin()
        const updateQuery = `UPDATE paycart SET count = @count WHERE id = @proID AND useremail = @email`
        const updateResult = await transaction.request()
            .input('count', parseInt(count, 10))
            .input('proID', proID)
            .input('email', email)
            .query(updateQuery)
        if (updateResult.rowsAffected[0] === 0) {
            await transaction.rollback()
            return res.json({ success: false, message: '购物车商品不存在或已删除' })
        }
        const searchQuery = `SELECT category FROM product WHERE id = @proID`
        const searchResult = await transaction.request()
            .input('proID', proID)
            .query(searchQuery)
        if (searchResult.recordset.length === 0) {
            await transaction.rollback()
            return res.status(404).json({ success: false, message: '商品不存在' })
        }
        const category = searchResult.recordset[0].category
        const ip = req.ip
        const insertQuery = `
            INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
            VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'user')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '增加购物车商品数量')
            .input('remark1', `商品ID:${proID}`)
            .input('remark2', `更新数量:${count}`)
            .input('remark3', `商品类别:${category}`)
            .query(insertQuery)
        await transaction.commit()
        return res.json({ success: true, message: '购物车商品数量已更新' });
    } catch (err) {
        await transaction.rollback()
        console.error('更新失败:', err)
        return res.status(500).json({ success: false, message: '数据库更新失败' })
    }
})
//发起交易
app.post('/checkoutproduct', async (req, res) => {
    const { name, email, selectedProducts } = req.body
    let transaction
    try {
        const pool = await poolPromise
        transaction = pool.transaction()
        await transaction.begin()
        let amount = 0
        let orderDetails = []  // 存储订单信息
        let newStockMap = {}   // 记录新库存
        // 遍历所有商品
        for (const element of selectedProducts) {
            const productQuery = `
                SELECT stock
                FROM product 
                WHERE product.id = @proID 
                AND product.pname = @pname 
                AND product.price = @price 
                AND product.category = @category 
                AND product.status = '1'`
            const productResult = await transaction.request()
                .input('proID', element.proID)
                .input('pname', element.pname)
                .input('price', element.price)
                .input('category', element.category)
                .input('email', email)
                .query(productQuery)
            if (productResult.recordset.length === 0) {
                await transaction.rollback()
                return res.json({ success: false, status: 2, message: `商品：${element.pname}，信息出现变动，请刷新页面` })
            }
            const { stock } = productResult.recordset[0]
            // 检查库存是否足够
            if (stock < element.count) {
                await transaction.rollback()
                return res.json({ success: false, status: 3, product: element, message: '库存不足' })
            }
            // 计算订单总额
            amount += parseFloat(element.count) * element.price
            // 生成订单号
            const orderId = `${Date.now()}${Math.floor(Math.random() * 1000)} `
            const orderTime = new Date().toLocaleString()
            // 记录订单信息
            orderDetails.push({
                proID: element.proID,
                pname: element.pname,
                price: element.price,
                count: element.count,
                image_url: element.image_url,
                category: element.category,
                orderId,
                orderTime
            })
            // 记录新库存
            newStockMap[element.proID] = stock - element.count
        }
        // 检查用户余额
        const userBalanceQuery = `SELECT umoney FROM useraccount WHERE email = @email`
        const userBalanceResult = await transaction.request()
            .input('email', email)
            .query(userBalanceQuery)
        if (userBalanceResult.recordset.length === 0 || userBalanceResult.recordset[0].umoney < amount) {
            await transaction.rollback();
            return res.json({ success: false, status: 4, message: '余额不足' })
        }
        // 批量插入订单
        for (const order of orderDetails) {
            const orderQuery = `
                INSERT INTO userOrder(OrderId, id, price, count, Ordertime, image_url, pname, category, useremail)
    VALUES(@OrderId, @proID, @price, @count, @Ordertime, @image_url, @pname, @category, @useremail);
                INSERT INTO shopOrder(OrderId, id, price, count, Ordertime, image_url, pname, category, useremail)
    VALUES(@OrderId, @proID, @price, @count, @Ordertime, @image_url, @pname, @category, @useremail);`
            await transaction.request()
                .input('OrderId', order.orderId)
                .input('proID', order.proID)
                .input('price', order.price)
                .input('count', order.count)
                .input('Ordertime', order.orderTime)
                .input('image_url', order.image_url)
                .input('pname', order.pname)
                .input('category', order.category)
                .input('useremail', email)
                .query(orderQuery)
        }
        // 更新用户余额
        const newBalance = userBalanceResult.recordset[0].umoney - amount
        const updateUserQuery = `UPDATE useraccount SET umoney = @newBalance WHERE email = @email`
        await transaction.request()
            .input('newBalance', newBalance.toFixed(2))
            .input('email', email)
            .query(updateUserQuery)
        // 批量更新库存
        for (const [proID, newStock] of Object.entries(newStockMap)) {
            const updateStockQuery = `UPDATE product SET stock = @newStock WHERE id = @proID`
            await transaction.request()
                .input('newStock', newStock)
                .input('proID', proID)
                .query(updateStockQuery)
        }
        for (const element of selectedProducts) {
            const deletecartQuery = `DELETE FROM paycart WHERE id = @proID`
            await transaction.request()
                .input('proID', element.proID)
                .query(deletecartQuery)
        }
        const ip = req.ip
        for (const order of orderDetails) {
            const insertQuery = `
            INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
            VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
            await transaction.request()
                .input('who', 'user')
                .input('email', email)
                .input('name', name)
                .input('ip', ip)
                .input('time', order.orderTime)
                .input('operation', '购买商品')
                .input('remark1', `商品ID:${order.proID}`)
                .input('remark2', `数量:${order.count}`)
                .input('remark3', `商品类别:${order.category}`)
                .query(insertQuery)
        }
        // 提交事务
        await transaction.commit()
        return res.json({ success: true, newBalance, message: '购买商品成功' })
    } catch (error) {
        if (transaction) {
            await transaction.rollback()
        }
        console.error('数据库操作失败:', error.message)
        return res.status(500).json({ success: false, status: 1, message: '网络异常' })
    }
})
//--------商家----------------------------
//商家上传图片
app.post('/uploadimg', upload.single('image'), (req, res) => {
    if (req.file) {
        res.json({
            success: true,
            filePath: `/images/${req.file.filename}`
        })
    } else {
        res.json({
            success: false,
            message: '图片上传失败'
        })
    }
})
//删除旧照片
function deleteimg(temporaryimg, newImagePath) {
    // 图片存放的文件夹路径
    const imageFolderPath = path.join(__dirname, 'public', 'images')
    // 遍历temporaryimg数组，删除除newImagePath以外的所有图片
    temporaryimg.forEach((oldImagePath) => {
        // 如果旧图片路径与新图片路径不一样，才删除
        if (path.basename(oldImagePath) !== path.basename(newImagePath)) {
            // 提取文件名（xxx.jpg）
            const filename = path.basename(oldImagePath)
            const fullPath = path.join(imageFolderPath, filename)
            // 判断文件是否存在，存在则删除
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }
    })
}
//商家取消修改 删除刚上传的照片
app.post('/deletenewimg', async (req, res) => {
    const { temporaryimg, newimage_url } = req.body
    deleteimg(temporaryimg, newimage_url)
})
//商家商品上传审核
app.post('/reviewpro', async (req, res) => {
    const { name, pname, price, category, stock, email, image_url, proID, temporaryimg } = req.body
    const pool = await poolPromise;
    const transaction = pool.transaction()
    try {
        await transaction.begin()
        //获取旧图片路径
        const oldImageQuery = `SELECT image_url FROM product WHERE id=@proID`
        const oldImageResult = await transaction.request()
            .input('proID', proID)
            .query(oldImageQuery)
        let oldImagePath = null
        if (oldImageResult.recordset.length > 0) {
            oldImagePath = oldImageResult.recordset[0].image_url
        }
        temporaryimg.push(oldImagePath)
        //更新商品信息
        const updateQuery = `
            UPDATE product
            SET pname=@pname, price=@price, category=@category, stock=@stock, image_url=@image_url, status='2',reviewfailresult=' '
            WHERE id=@proID`
        const updateResult = await transaction.request()
            .input('pname', pname)
            .input('price', price)
            .input('category', category)
            .input('stock', stock)
            .input('image_url', image_url)
            .input('proID', proID)
            .query(updateQuery)
        if (updateResult.rowsAffected[0] === 0) {
            await transaction.rollback()
            return res.json({ success: false, message: '上传审核失败，商品ID不存在！' })
        }
        //删除旧图片

        deleteimg(temporaryimg, image_url)
        //记录操作日志
        const ip = req.ip
        const insertQuery = `
            INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
            VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'shop')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '上传商品审核')
            .input('remark1', `商品ID:${proID}`)
            .input('remark2', '')
            .input('remark3', '')
            .query(insertQuery)
        await transaction.commit()
        return res.json({ success: true, message: '上传审核成功' })
    } catch (err) {
        await transaction.rollback()
        console.error('上传审核失败:', err)
        return res.status(500).json({ success: false, message: '上传失败' })
    }
})

//商家调整商品上下架 0下架 1上架 2审核中 3审核失败
app.post('/statuspro', async (req, res) => {
    const { name, email, status, proID } = req.body
    const pool = await poolPromise;
    const transaction = pool.transaction()
    try {
        await transaction.begin()
        // 1. 更新商品状态
        const updateQuery = `
            UPDATE product
            SET status=@status
            WHERE id=@proID`
        const updateResult = await transaction.request()
            .input('status', status)
            .input('proID', proID)
            .query(updateQuery)
        if (updateResult.rowsAffected[0] === 0) {
            await transaction.rollback()
            return res.json({ success: false, message: '操作失败，商品ID不存在！' })
        }
        const ip = req.ip
        const insertQuery = `
            INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
            VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'shop')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', status == 1 ? '上架商品' : '下架商品')
            .input('remark1', `商品ID:${proID}`)
            .input('remark2', '')
            .input('remark3', '')
            .query(insertQuery)
        await transaction.commit()
        return res.json({ success: true, message: status == 1 ? '上架商品成功' : '下架商品成功' })
    } catch (err) {
        await transaction.rollback()
        console.error('更新失败:', err)
        return res.status(500).json({ success: false, message: '操作失败' })
    }
})
//商家展示订单
app.post('/showShoporder', async (req, res) => {
    try {
        const { email, name } = req.body;
        const pool = await poolPromise
        const searchQuery = `SELECT shopOrder.* FROM shopOrder 
        JOIN product ON shopOrder.id=product.id
        WHERE product.salesperson_email=@email
        ORDER BY OrderId DESC`
        const searchResult = await pool.request()
            .input('email', email)
            .query(searchQuery)
        return res.json({ data: searchResult.recordset })

    } catch (err) {
        console.error('查询错误:', err);
        res.status(500).send('数据库查询失败')
    }
})
//商家发货
app.post('/sendOrder', async (req, res) => {
    const { email, name, OrderId, useremail, ordername } = req.body
    const pool = await poolPromise
    const transaction = pool.transaction()
    try {
        await transaction.begin()
        const updateQuery = `
            UPDATE shopOrder SET status='1' WHERE OrderId=@OrderId;
            UPDATE userOrder SET status='1' WHERE OrderId=@OrderId;`
        const updateResult = await transaction.request()
            .input('OrderId', OrderId)
            .query(updateQuery)
        if (updateResult.rowsAffected.reduce((sum, val) => sum + val, 0) === 0) {
            await transaction.rollback()
            return res.json({ success: false, message: "订单不存在，发货失败！" })
        }
        const ip = req.ip;
        const insertQuery = `
            INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
            VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3);`
        await transaction.request()
            .input('who', 'shop')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', `发货`)
            .input('remark1', `订单编号:${OrderId}`)
            .input('remark2', `商品名:${ordername}`)
            .input('remark3', '')
            .query(insertQuery)
        let sendEmailType = `您的订单：订单编号：${OrderId}, 商品名：${ordername} 已发货`
        sendOrderEmail(useremail, sendEmailType)
        await transaction.commit()
        return res.json({ success: true, message: "发货成功" })
    } catch (err) {
        await transaction.rollback()
        console.error('发货失败:', err)
        return res.status(500).json({ success: false, message: "发货失败" })
    }
})
//商家查看不同状态的订单数据
app.post('/checkshoporderfetch', async (req, res) => {
    const { email, status, name } = req.body
    const pool = await poolPromise
    const transaction = pool.transaction()
    try {
        await transaction.begin()
        // 1. 查询商家订单
        const searchQuery = `
            SELECT shopOrder.* FROM shopOrder
            JOIN product ON shopOrder.id = product.id
            WHERE product.salesperson_email = @email AND shopOrder.status = @status
            ORDER BY OrderId DESC; `
        const searchResult = await transaction.request()
            .input('email', email)
            .input('status', status)
            .query(searchQuery)
        const ip = req.ip;
        const insertQuery = `
                INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
                VALUES (@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3);`
        await transaction.request()
            .input('who', 'shop')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', `查看${status == 1 ? '已发货' : '待发货'}订单`)
            .input('remark1', '')
            .input('remark2', '')
            .input('remark3', '')
            .query(insertQuery)
        await transaction.commit()
        return res.json({ success: true, data: searchResult.recordset })
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err)
        return res.status(500).json({ success: false, message: "数据库查询失败" })
    }
})
//搜索订单
app.post('/searchshoporder', async (req, res) => {
    const pool = await poolPromise
    const transaction = pool.transaction()
    await transaction.begin()
    try {
        const { category, email, searchUserinput, name } = req.body
        let searchQuery = `SELECT shopOrder.* FROM shopOrder 
        JOIN product ON shopOrder.id=product.id
        WHERE product.salesperson_email=@email`
        if (searchUserinput) {
            searchQuery += ` AND (OrderId LIKE '%${searchUserinput}%' OR shopOrder.useremail LIKE '%${searchUserinput}%')`
        }
        // 添加分类筛选（如果 category 不是 '全部' 才加条件）
        if (category && category !== "全部") {
            searchQuery += ` AND shopOrder.category = @category`
        }
        const request = transaction.request()
            .input('email', email)
        if (category && category !== "全部") {
            request.input('category', category)
        }
        searchQuery += ` ORDER BY status ASC, OrderId DESC`
        const searchResult = await request.query(searchQuery)
        const ip = req.ip
        const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'shop')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '搜索订单')
            .input('remark1', '')
            .input('remark2', `搜索内容:${searchUserinput}`)
            .input('remark3', `商品类别:${category}`)
            .query(insertQuery)
        await transaction.commit()
        return res.json({
            success: searchResult.recordset.length > 0,
            data: searchResult.recordset
        })
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
// 添加商品
app.post('/addproduct', async (req, res) => {
    const pool = await poolPromise
    const transaction = pool.transaction()
    await transaction.begin()
    try {
        const { pname, price, category, stock, image_url, name, email } = req.body
        // 查询当前最大id
        const searchQuery = `SELECT MAX(id) AS max_id FROM product`
        const searchResult = await transaction.request().query(searchQuery)
        // 生成新的id
        const id = searchResult.recordset[0].max_id ? parseInt(searchResult.recordset[0].max_id) + 1 : 1
        // 插入商品数据
        const insertQuery = `INSERT INTO product (id, pname, price, category, stock, image_url, salesperson_email, status) 
                             VALUES (@id, @pname, @price, @category, @stock, @image_url, @salesperson_email, '2')`
        const insertResult = await transaction.request()
            .input('id', id)
            .input('pname', pname)
            .input('price', price)
            .input('category', category)
            .input('stock', stock)
            .input('image_url', image_url)
            .input('salesperson_email', email)
            .query(insertQuery)
        if (insertResult.rowsAffected[0] > 0) {
            // 提交事务
            const ip = req.ip
            const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
            await transaction.request()
                .input('who', 'shop')
                .input('email', email)
                .input('name', name)
                .input('ip', ip)
                .input('time', new Date().toLocaleString())
                .input('operation', '添加商品')
                .input('remark1', `商品ID:${id}`)
                .input('remark2', ``)
                .input('remark3', ``)
                .query(insertQuery)
            await transaction.commit()
            return res.json({
                success: true,
                message: "商品上传审核成功"
            })
        } else {
            // 回滚事务
            await transaction.rollback()
            return res.json({ success: false, message: "商品上传审核失败" })
        }
    } catch (err) {
        // 错误发生时回滚事务
        await transaction.rollback()
        console.error('查询错误:', err)
        return res.json({ success: false, message: "商品上传审核失败" })
    }
})
// 发送订单邮件的函数
function sendOrderEmail(recipientEmail, sendEmailType) {
    let mailOptions = {
        from: '2501995333@qq.com',  // 发送者邮箱
        to: recipientEmail,         // 接收者邮箱
        subject: '订单发货通知',        // 邮件标题
        text: sendEmailType, // 邮件内容
    }
    transporter.sendMail(mailOptions)
}
//-------------管理员---------------------
//读取商家信息
app.post('/managershowshop', async (req, res) => {
    const { name, email } = req.body
    try {
        const pool = await poolPromise
        const searchQuery = `SELECT * FROM shopaccount WHERE who !='1'
         ORDER BY who`
        const result = await pool.request()
            .query(searchQuery)
        return res.json({ success: true, data: result.recordset })
    } catch (err) {
        console.error('查询失败:', err)
        return res.status(500).json({ success: false })
    }
})
//搜索商家
app.post('/searchshopaccount', async (req, res) => {
    const pool = await poolPromise
    const transaction = pool.transaction()
    await transaction.begin()
    try {
        const { email, searchUserinput, name } = req.body
        let searchQuery = `SELECT * FROM shopaccount  WHERE who !='1' `
        if (searchUserinput) {
            searchQuery += ` AND email LIKE '%${searchUserinput}%'`
        }
        const request = transaction.request()
            .input('searchUserinput', searchUserinput)
        searchQuery += ` ORDER BY who`
        const searchResult = await request.query(searchQuery)
        const ip = req.ip
        const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'shop')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', '搜索商家')
            .input('remark1', ``)
            .input('remark2', `搜索内容:${searchUserinput}`)
            .input('remark3', ``)
            .query(insertQuery)
        await transaction.commit()
        return res.json({
            data: searchResult.recordset
        })
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err);
        res.status(500).send('数据库查询失败')
    }
})
//查看不同状态的商家(该功能不要了)
app.post('/checkShopStatus', async (req, res) => {
    const pool = await poolPromise
    const transaction = pool.transaction()
    await transaction.begin()
    try {
        const { email, status, name } = req.body;
        const searchQuery = `SELECT * FROM shopaccount  WHERE who =@status `
        const searchResult = await transaction.request()
            .input('status', status)
            .query(searchQuery)
        const ip = req.ip
        const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'shop')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', `查看${status == 2 ? '在职' : '离职'}商家`)
            .input('remark1', ``)
            .input('remark2', `搜索内容:${searchUserinput}`)
            .input('remark3', ``)
            .query(insertQuery)
        await transaction.commit()
        return res.json({
            success: true,
            data: searchResult.recordset
        })
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err);
        res.status(500).send('数据库查询失败')
    }
})
//商品审核
app.post('/reviewingproduct', async (req, res) => {
    const pool = await poolPromise
    const transaction = pool.transaction()
    await transaction.begin()
    try {
        const { email, status, name, proId, inputquery = ' ' } = req.body;
        const updateQuery = `UPDATE product 
        SET status=@status ,reviewfailresult=@inputquery 
        Where id=@proId `
        const updateResult = await transaction.request()
            .input('status', status)
            .input('inputquery', inputquery)
            .input('proId', proId)
            .query(updateQuery)
        const ip = req.ip
        const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'shop')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', `${status == 1 ? '审核商品通过' : '驳回商品审核'}`)
            .input('remark1', `商品ID：${proId}`)
            .input('remark2', `原因:${inputquery}`)
            .input('remark3', ``)
            .query(insertQuery)
        await transaction.commit()
        if (updateResult.rowsAffected[0] > 0) {
            return res.json({
                success: true,
                message: '操作成功'
            })
        }
        else {
            await transaction.rollback()
            return res.json({
                success: false,
                message: '操作失败'
            })
        }
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//重置商家密码
app.post('/resetshoppwd', async (req, res) => {
    const pool = await poolPromise
    const transaction = pool.transaction()
    await transaction.begin()
    try {
        const { email, name, shopemail } = req.body;
        const pool = await poolPromise
        const updateQuery = `UPDATE shopaccount 
        SET pwd=@pwd 
        Where email=@email `
        const updateResult = await pool.request()
            .input('pwd', '123456')
            .input('email', shopemail)
            .query(updateQuery)
        const ip = req.ip
        const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
        await transaction.request()
            .input('who', 'shop')
            .input('email', email)
            .input('name', name)
            .input('ip', ip)
            .input('time', new Date().toLocaleString())
            .input('operation', `重置商家密码`)
            .input('remark1', `商家邮箱：${shopemail}`)
            .input('remark2', ``)
            .input('remark3', ``)
            .query(insertQuery)
        await transaction.commit()
        if (updateResult.rowsAffected[0] > 0) {
            return res.json({
                success: true,
                message: '操作成功'
            })
        }
        else {
            await transaction.rollback()
            return res.json({
                success: false,
                message: '操作失败'
            })
        }
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//删除商家（相关商品全部删除）
app.post('/deleteshop', async (req, res) => {
    try {
        const { email, name, shopemail } = req.body
        const pool = await poolPromise;
        const transaction = pool.transaction()
        await transaction.begin()
        try {
            const searchOrderQuery = `select shopOrder.*From shopOrder
            JOIN product ON shopOrder.id=product.id
            where product.salesperson_email=@shopemail AND shopOrder.status='0'`
            const searchOrderResult = await transaction.request()
                .input('shopemail', shopemail)
                .query(searchOrderQuery)
            if (searchOrderResult.recordset.length > 0) {
                await transaction.rollback()
                return res.json({ success: false, message: '商家有未完成订单, 无法删除' })
            }
            const deletepaycartQuery = `DELETE FROM paycart
             WHERE id IN (SELECT id FROM product WHERE salesperson_email = @shopemail)`
            const deletepaycartResult = await transaction.request()
                .input('shopemail', shopemail)
                .query(deletepaycartQuery)
            const deleteProductQuery = `DELETE FROM product WHERE salesperson_email = @shopemail;`
            const deleteProductResult = await transaction.request()
                .input('shopemail', shopemail)
                .query(deleteProductQuery)
            // 删除商家账户
            const deleteShopQuery = `DELETE FROM shopaccount WHERE email = @shopemail`
            const deleteShopResult = await transaction.request()
                .input('shopemail', shopemail)
                .query(deleteShopQuery)
            // 确保至少有一条记录被删除
            if (deleteShopResult.rowsAffected[0] > 0) {
                const ip = req.ip
                const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
                await transaction.request()
                    .input('who', 'shop')
                    .input('email', email)
                    .input('name', name)
                    .input('ip', ip)
                    .input('time', new Date().toLocaleString())
                    .input('operation', `删除商家`)
                    .input('remark1', `商家邮箱：${shopemail}`)
                    .input('remark2', ``)
                    .input('remark3', ``)
                    .query(insertQuery)
                await transaction.commit()
                return res.json({ success: true, message: '商家删除成功' })
            } else {
                await transaction.rollback()
                return res.json({ success: false, message: '未找到该商家，删除失败' })
            }
        } catch (error) {
            await transaction.rollback()
            console.error('删除商家失败:', error)
            return res.status(500).json({ success: false, message: '删除失败，数据库错误' })
        }
    } catch (err) {
        console.error('数据库连接失败:', err);
        return res.status(500).json({ success: false, message: '服务器错误，无法连接数据库' })
    }
})
//添加商家 1管理员 2在职商家
app.post('/addshop', async (req, res) => {
    const pool = await poolPromise;
    const transaction = pool.transaction()
    await transaction.begin()
    try {
        const { email, name, shopemail, shoppwd, shopname } = req.body
        const pool = await poolPromise
        const searchQuery = `
            SELECT email, sname
            FROM shopaccount 
            WHERE email = @shopemail OR sname = @shopname`
        const searchResult = await transaction.request()
            .input('shopemail', shopemail)
            .input('shopname', shopname)
            .query(searchQuery)
        if (searchResult.recordset.length > 0) {
            const existingEmail = searchResult.recordset.some(record => record.email === shopemail)
            return res.json({
                success: false,
                message: existingEmail ? `邮箱已存在` : '商家名已存在'
            })
        }
        const insertQuery = `
            INSERT INTO shopaccount (email, sname, pwd, who)
            VALUES (@shopemail, @shopname, @shoppwd, '2')`
        const insertResult = await transaction.request()
            .input('shopemail', shopemail)
            .input('shopname', shopname)
            .input('shoppwd', shoppwd)
            .query(insertQuery)
        if (insertResult.rowsAffected[0] > 0) {
            const ip = req.ip
            const insertQuery = `
        INSERT INTO operations (who, email, name, ip, time, operation, remark1, remark2, remark3)
        VALUES(@who, @email, @name, @ip, @time, @operation, @remark1, @remark2, @remark3)`
            await transaction.request()
                .input('who', 'shop')
                .input('email', email)
                .input('name', name)
                .input('ip', ip)
                .input('time', new Date().toLocaleString())
                .input('operation', `添加商家`)
                .input('remark1', `商家邮箱：${shopemail}`)
                .input('remark2', ``)
                .input('remark3', ``)
                .query(insertQuery)
            await transaction.commit()
            return res.json({ success: true, message: '添加成功' })
        } else {
            await transaction.rollback()
            return res.json({ success: false, message: '添加失败' })
        }
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err)
        res.status(500).send('数据库操作失败')
    }
})

//-----------------------------------------------------------------
//商家数据图
app.post('/shopSalesData', async (req, res) => {
    try {
        //类别销量图，所有商品销量图，每日销量图
        const { email } = req.body
        const pool = await poolPromise
        // 类别销量图
        const searchQuery = `
        SELECT shopOrder.category,
        SUM(shopOrder.count) AS total_count,
        SUM(shopOrder.count * product.price) AS total_sales
        FROM shopOrder
        JOIN product ON shopOrder.id = product.id
        WHERE product.salesperson_email = @email
        GROUP BY shopOrder.category;`
        const searchResult = await pool.request()
            .input('email', email)
            .query(searchQuery)
        const result = {
            categories: [],
            totalCounts: [],
            totalSales: []
        }
        searchResult.recordset.forEach(row => {
            result.categories.push(row.category)
            result.totalCounts.push(row.total_count)
            result.totalSales.push(parseFloat(row.total_sales).toFixed(2))
        })
        //每日销量图
        const searchQuery2 = `
        SELECT
            CAST(shopOrder.Ordertime AS DATE) AS sale_date,  
            SUM(shopOrder.count) AS total_count,             
            SUM(shopOrder.count * shopOrder.price) AS total_sales
        FROM
            shopOrder
        JOIN
            product ON shopOrder.id = product.id
        WHERE
            product.salesperson_email = @email
            AND shopOrder.Ordertime >= DATEADD(day, -30, GETDATE())
        GROUP BY
            CAST(shopOrder.Ordertime AS DATE)
        ORDER BY
            sale_date ASC;`
        const searchResult2 = await pool.request()
            .input('email', email)
            .query(searchQuery2)
        const result2 = {
            dates: [],
            totalCounts: [],
            totalSales: []
        }
        searchResult2.recordset.forEach(row => {
            result2.dates.push(new Date(row.sale_date).toLocaleDateString())
            result2.totalCounts.push(row.total_count)
            result2.totalSales.push(parseFloat(row.total_sales).toFixed(2))
        })
        //所有商品销量图
        const searchQuery3 = `
        SELECT shopOrder.id, SUM(shopOrder.count) AS total_count
        FROM shopOrder
        JOIN product ON shopOrder.id = product.id
        WHERE product.salesperson_email = @email
        GROUP BY shopOrder.id
        Order BY total_count DESC;`
        const searchResult3 = await pool.request()
            .input('email', email)
            .query(searchQuery3)
        const result3 = {
            id: [],
            totalCounts: []
        }
        searchResult3.recordset.forEach(row => {
            result3.id.push(`商品ID:[${row.id}]`)
            result3.totalCounts.push(row.total_count)
        })
        res.json({
            categories: result,
            sevenday: result2,
            product: result3
        })
    } catch (err) {
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})
//管理员数据图
app.post('/managerSalesData', async (req, res) => {
    try {
        //类别销量图，所有商品销量图，每日销量图
        const pool = await poolPromise
        // 类别销量图
        const searchQuery = `
        SELECT shopaccount.email,
        SUM(shopOrder.count) AS total_count,
        SUM(shopOrder.count * product.price) AS total_sales
        FROM shopOrder
        JOIN product ON shopOrder.id = product.id
        JOIN shopaccount ON product.salesperson_email = shopaccount.email
        GROUP BY shopaccount.email
        ORDER BY total_count DESC;`
        const searchResult = await pool.request()
            .query(searchQuery)
        const result = {
            email: [],
            totalCounts: [],
            totalSales: []
        }
        searchResult.recordset.forEach(row => {
            result.email.push(row.email)
            result.totalCounts.push(row.total_count)
            result.totalSales.push(parseFloat(row.total_sales).toFixed(2))
        })
        //每日销量图
        const searchQuery2 = `
        SELECT
            shopOrder.category,
            CAST(shopOrder.Ordertime AS DATE) AS sale_date,  
            SUM(shopOrder.count) AS total_count,             
            SUM(shopOrder.count * shopOrder.price) AS total_sales
        FROM
            shopOrder
        JOIN
            product ON shopOrder.id = product.id
        JOIN
            shopaccount ON product.salesperson_email = shopaccount.email
        WHERE
            shopOrder.Ordertime >= DATEADD(day, -30, GETDATE())
        GROUP BY
            shopOrder.category,CAST(shopOrder.Ordertime AS DATE)
        ORDER BY
            sale_date ASC;`
        const searchResult2 = await pool.request()
            .query(searchQuery2)
        // 初始化分类数据结构
        const result2 = {}
        const allDates = new Set() // 用于存储所有出现的日期
        // 处理数据
        searchResult2.recordset.forEach(row => {
            const { category, sale_date, total_count, total_sales } = row
            allDates.add(new Date(sale_date).toLocaleDateString())
            if (!result2[category]) {
                result2[category] = { dates: [], totalCounts: [], totalSales: [] }
            }
            result2[category].dates.push(new Date(sale_date).toLocaleDateString())
            result2[category].totalCounts.push(total_count);
            result2[category].totalSales.push(parseFloat(total_sales).toFixed(2))
        })
        const sortedDates = Array.from(allDates)
            .sort((a, b) => a - b)
        Object.keys(result2).forEach(category => {
            const categoryData = result2[category]
            // 重新排列每个类别的日期、销量数据，确保顺序一致
            const categoryCounts = sortedDates.map(date => {
                //index 是看这个日期在这组数据的下标位置，
                //能找到当前日期就说明当天有销量和销售额，返回同样位置的数据，
                //找不到则当天没有卖出，返回0和0.00
                const index = categoryData.dates.indexOf(date)
                return index !== -1 ? categoryData.totalCounts[index] : 0 // 如果没有找到该日期的数据，填充 0
            })
            const categorySales = sortedDates.map(date => {
                const index = categoryData.dates.indexOf(date)
                return index !== -1 ? categoryData.totalSales[index] : "0.00"// 如果没有找到该日期的数据，填充 0
            })
            // 更新该类别里面的所有数据
            categoryData.dates = sortedDates
            categoryData.totalCounts = categoryCounts
            categoryData.totalSales = categorySales
        })
        res.json({
            shop: result,
            sevenday: result2,
            sortedDates
        })
    } catch (err) {
        console.error('查询错误:', err)
        res.status(500).send('数据库查询失败')
    }
})

//类别推荐
//1、计算总订单每个类别的数量（占比5%）
//2、计算最近一个星期各类商品总停留时长（占比25%）
//3、计算最近一个星期搜索商品类别的次数（占比20%）
//4、购物车商品类别数量（占比40%）
//5、最近一个月购买的商品类别数量（占比10%）
//计算5个合1的综合排名？
//推荐优先推荐前面两类

//价格推荐
//记录购物车低中高三种价位的商品次数（不需要记录总数）（30%）
//记录最近一个月低中高三种价位的购买商品次数（70%）
//计算2个合1的综合排名？
//推荐优先推荐前面两类价位
//获取用户数据
//用户画像初始化
async function getnewpersona(email) {
    return {
        email: email,
        MeybeInterests: {
            数码产品: {
                love: 0,
                paypower: []
            },
            食品: {
                love: 0,
                paypower: []
            },
            服装: {
                love: 0,
                paypower: []
            },
            生活用品: {
                love: 0,
                paypower: []
            }
        },
        CartCategory: {
            数码产品: 0,
            食品: 0,
            服装: 0,
            生活用品: 0
        },
        AllOrderCategory: {
            数码产品: 0,
            食品: 0,
            服装: 0,
            生活用品: 0
        },
        SevendaySearchCount: {
            数码产品: 0,
            食品: 0,
            服装: 0,
            生活用品: 0
        },
        SevendayBrowsingTime: {
            数码产品: 0,
            食品: 0,
            服装: 0,
            生活用品: 0
        },
        MonthOrderCategory: {
            数码产品: 0,
            食品: 0,
            服装: 0,
            生活用品: 0
        },
        CartMoney: {
            数码产品: {
                low: 0,
                medium: 0,
                high: 0
            },
            食品: {
                low: 0,
                medium: 0,
                high: 0
            },
            服装: {
                low: 0,
                medium: 0,
                high: 0
            },
            生活用品: {
                low: 0,
                medium: 0,
                high: 0
            }
        },
        MonthOrderMoney: {
            数码产品: {
                low: 0,
                medium: 0,
                high: 0
            },
            食品: {
                low: 0,
                medium: 0,
                high: 0
            },
            服装: {
                low: 0,
                medium: 0,
                high: 0
            },
            生活用品: {
                low: 0,
                medium: 0,
                high: 0
            }
        }
    }
}
//获取用户数据且写入用户画像
//进入主页更新画像，退出登录也更新画像
async function getuserdata(email) {
    const profile = await getnewpersona(email)
    const pool = await poolPromise
    const transaction = pool.transaction()
    try {
        await transaction.begin()
        // 1、计算总订单每个类别的数量（占比5 %）
        const searchQuery1 = `
        SELECT category, COUNT(*) AS count 
        FROM shopOrder 
        WHERE useremail = @email
        GROUP BY category`
        const result1 = await transaction.request()
            .input('email', email)
            .query(searchQuery1)
        result1.recordset.forEach(row => {
            if (profile.AllOrderCategory.hasOwnProperty(row.category)) {
                profile.AllOrderCategory[row.category] = row.count
            }
        })
        //2、计算最近一个星期各类商品总停留时长（占比25%）
        // RTRIM(LTRIM(...))：用来去除前后的空格，确保数据整洁。
        // SUBSTRING(..., CHARINDEX(':', ...) + 1, LEN(...))：提取 remark2 和 remark3 的实际内容，去掉:前的部分。
        // SUM(CAST(...AS FLOAT))：将提取的停留时长转换为浮动数值类型并求和。
        // DATEADD(day, -7, GETDATE())：查询过去 7 天的数据
        const searchQuery2 = `
        SELECT
            RTRIM(LTRIM(SUBSTRING(remark3, CHARINDEX(':', remark3) + 1, LEN(remark3)))) AS category,
            SUM(CAST(RTRIM(LTRIM(SUBSTRING(remark2, CHARINDEX(':', remark2) + 1, LEN(remark2)))) AS FLOAT)) AS total_browsing_time
        FROM operations
        WHERE
            time >= DATEADD(day, -7, GETDATE())
            AND remark2 LIKE '停留时长:%'
            AND remark3 LIKE '商品类别:%'
            AND email = @email
            AND who = 'user'
        GROUP BY
            RTRIM(LTRIM(SUBSTRING(remark3, CHARINDEX(':', remark3) + 1, LEN(remark3))))`
        const result2 = await transaction.request()
            .input('email', email)
            .query(searchQuery2)
        result2.recordset.forEach(row => {
            if (profile.SevendayBrowsingTime.hasOwnProperty(row.category)) {
                profile.SevendayBrowsingTime[row.category] = parseFloat(row.total_browsing_time).toFixed(2)
            }
        })
        //3、计算最近一个星期搜索商品类别的次数（占比20%）
        const searchQuery3 = `
        SELECT
            RTRIM(LTRIM(SUBSTRING(remark3, CHARINDEX(':', remark3) + 1, LEN(remark3)))) AS category,
            COUNT(*) AS count
        FROM operations
        WHERE
            time >= DATEADD(day, -7, GETDATE())
            AND remark3 LIKE '商品类别:%'
            AND remark2 LIKE '搜索内容:%'
            AND email = @email
            AND who = 'user'
        GROUP BY
            RTRIM(LTRIM(SUBSTRING(remark3, CHARINDEX(':', remark3) + 1, LEN(remark3))))`
        const result3 = await transaction.request()
            .input('email', email)
            .query(searchQuery3)
        result3.recordset.forEach(row => {
            if (profile.SevendaySearchCount.hasOwnProperty(row.category)) {
                profile.SevendaySearchCount[row.category] = row.count
            }
        })
        //4、购物车商品类别数量（占比40%）
        const searchQuery4 = `
        SELECT product.category, COUNT(*) AS count 
        FROM  paycart
        JOIN product ON product.id=paycart.id
        WHERE paycart.useremail = @email
        GROUP BY product.category`
        const result4 = await transaction.request()
            .input('email', email)
            .query(searchQuery4)
        result4.recordset.forEach(row => {
            if (profile.CartCategory.hasOwnProperty(row.category)) {
                profile.CartCategory[row.category] = row.count
            }
        })
        //5、最近一个月购买的商品类别数量（占比10%）
        const searchQuery5 = `
        SELECT category, COUNT(*) AS count
        FROM shopOrder
        WHERE   
        Ordertime >= DATEADD(day, -30, GETDATE())
        AND useremail = @email
        GROUP BY category`
        const result5 = await transaction.request()
            .input('email', email)
            .query(searchQuery5)
        result5.recordset.forEach(row => {
            if (profile.MonthOrderCategory.hasOwnProperty(row.category)) {
                profile.MonthOrderCategory[row.category] = row.count
            }
        })
        //6、记录购物车低<100,中100-500 高>500三种价位的商品次数（不需要记录总数）（30%）
        const searchQuery6 = `
        SELECT
            product.category,
            SUM(CASE WHEN product.price < 100 THEN 1 ELSE 0 END) AS low_price_count,
            SUM(CASE WHEN product.price BETWEEN 100 AND 500 THEN 1 ELSE 0 END) AS medium_price_count,
            SUM(CASE WHEN product.price > 500 THEN 1 ELSE 0 END) AS high_price_count
        FROM product
        JOIN paycart ON product.id = paycart.id
        WHERE paycart.useremail = @email
        GROUP BY product.category;`
        const result6 = await transaction.request()
            .input('email', email)
            .query(searchQuery6)
        result6.recordset.forEach(row => {
            if (profile.CartMoney.hasOwnProperty(row.category)) {
                profile.CartMoney[row.category] = {
                    low: row.low_price_count,
                    medium: row.medium_price_count,
                    high: row.high_price_count
                }
            }
        })
        //7、记录最近一个月低中高三种价位的购买商品次数（70%）
        const searchQuery7 = `
        SELECT category,
            SUM(CASE WHEN price < 100 THEN 1 ELSE 0 END) AS low_price_count,
            SUM(CASE WHEN price BETWEEN 100 AND 500 THEN 1 ELSE 0 END) AS medium_price_count,
            SUM(CASE WHEN price > 500 THEN 1 ELSE 0 END) AS high_price_count
        FROM shopOrder
        WHERE   
        Ordertime >= DATEADD(day, -30, GETDATE())
        AND useremail = @email
        GROUP BY category`
        const result7 = await transaction.request()
            .input('email', email)
            .query(searchQuery7)
        result7.recordset.forEach(row => {
            if (profile.MonthOrderMoney.hasOwnProperty(row.category)) {
                profile.MonthOrderMoney[row.category] = {
                    low: row.low_price_count,
                    medium: row.medium_price_count,
                    high: row.high_price_count
                }
            }
        })
        // 计算并更新MeybeInterests
        await MathCategoryRanking(profile)
        await pool.request()
            .input('email', email)
            .input('persona', JSON.stringify(profile.MeybeInterests))
            .query('UPDATE useraccount SET persona = @persona WHERE email = @email');
        await transaction.commit()
    } catch (err) {
        await transaction.rollback()
        console.error('查询错误:', err)
        throw new Error('数据库查询失败')
    }
}
//权重计算函数
async function calculateProportions(data, total) {
    const proportions = {
        数码产品: 0,
        食品: 0,
        服装: 0,
        生活用品: 0
    }
    if (total != 0) {
        for (let category in data) {
            proportions[category] = data[category] / total
        }
    }
    return proportions
}
//生成用户画像
async function MathCategoryRanking(profile) {
    // 计算每个类别的比例，分别计算每个指标的比例
    const totalOrders = Object.values(profile.AllOrderCategory).reduce((acc, count) => acc + count, 0)
    const totalBrowsingTime = Object.values(profile.SevendayBrowsingTime).reduce((acc, time) => acc + parseFloat(time), 0)
    const totalSearchCount = Object.values(profile.SevendaySearchCount).reduce((acc, count) => acc + count, 0)
    const totalCartCount = Object.values(profile.CartCategory).reduce((acc, count) => acc + count, 0)
    const totalMonthOrders = Object.values(profile.MonthOrderCategory).reduce((acc, count) => acc + count, 0)
    // 等待比例计算
    const orderProportions = await calculateProportions(profile.AllOrderCategory, totalOrders)
    const browsingTimeProportions = await calculateProportions(profile.SevendayBrowsingTime, totalBrowsingTime)
    const searchCountProportions = await calculateProportions(profile.SevendaySearchCount, totalSearchCount)
    const cartProportions = await calculateProportions(profile.CartCategory, totalCartCount)
    const monthOrderProportions = await calculateProportions(profile.MonthOrderCategory, totalMonthOrders)
    // 计算综合评分
    const CategoryRanking = {}
    for (let category in profile.MeybeInterests) {
        CategoryRanking[category] =
            (orderProportions[category] * 0.05) +
            (browsingTimeProportions[category] * 0.25) +
            (searchCountProportions[category] * 0.20) +
            (cartProportions[category] * 0.40) +
            (monthOrderProportions[category] * 0.10)
    }
    // 更新MeybeInterests
    for (let category in profile.MeybeInterests) {
        profile.MeybeInterests[category].love = parseFloat(CategoryRanking[category]).toFixed(2)
    }
    const PaypowerRanking = {}
    for (let category in profile.CartMoney) {
        // 获取购物车和最近一个月购买的商品数量
        // 获取购物车和订单中每个类别的低、中、高价位数量
        const cartMoney = profile.CartMoney[category];
        const monthOrderMoney = profile.MonthOrderMoney[category];

        // 计算每个价位的总数
        const totalCartMoney = cartMoney.low + cartMoney.medium + cartMoney.high;
        const totalMonthOrderMoney = monthOrderMoney.low + monthOrderMoney.medium + monthOrderMoney.high;

        // 防止除以零的情况，默认总数为1，如果总数为0则避免计算
        const totalCartMoneySafe = totalCartMoney === 0 ? 1 : totalCartMoney;
        const totalMonthOrderMoneySafe = totalMonthOrderMoney === 0 ? 1 : totalMonthOrderMoney;
        // 计算每个价位的占比
        const lowCartProportion = cartMoney.low / totalCartMoneySafe;
        const mediumCartProportion = cartMoney.medium / totalCartMoneySafe;
        const highCartProportion = cartMoney.high / totalCartMoneySafe;

        const lowMonthProportion = monthOrderMoney.low / totalMonthOrderMoneySafe;
        const mediumMonthProportion = monthOrderMoney.medium / totalMonthOrderMoneySafe;
        const highMonthProportion = monthOrderMoney.high / totalMonthOrderMoneySafe;

        // 计算每个价位的综合得分，低价30%，高价70%
        const lowRanking = ((lowCartProportion * 0.30 + lowMonthProportion * 0.70)).toFixed(2);
        const mediumRanking = ((mediumCartProportion * 0.30 + mediumMonthProportion * 0.70)).toFixed(2);
        const highRanking = ((highCartProportion * 0.30 + highMonthProportion * 0.70)).toFixed(2);

        // 计算综合排名，可以根据需求调整合成方式
        PaypowerRanking[category] = {
            low: lowRanking,
            medium: mediumRanking,
            high: highRanking
        }
    }
    for (let category in profile.MeybeInterests) {
        const sortedRanking = Object.entries(PaypowerRanking[category])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
        profile.MeybeInterests[category].paypower[0] = sortedRanking[0][0]
        profile.MeybeInterests[category].paypower[1] = sortedRanking[1][0]
    }
}
//定时删除操作记录
async function deleteOldOperations() {
    try {
        const pool = await poolPromise
        // 计算 30 天前的日期
        const oneMonthAgo = new Date()
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30)
        // 格式化为 `YYYY/M/D HH:mm:ss`
        const formattedDate = `${oneMonthAgo.getFullYear()}/${oneMonthAgo.getMonth() + 1}/${oneMonthAgo.getDate()} 00:00:00`
        const query = `
            DELETE FROM operations 
            WHERE time < @date`
        await pool.request()
            .input("date", formattedDate)
            .query(query);
    } catch (error) {
        console.error("[ERROR] 删除过期记录时发生错误:", error)
    }
}
// 每天凌晨 12:00 运行任务
cron.schedule("0 0 * * *", async () => {
    console.log("触发定时任务：删除一个月前的 operations 记录")
    await deleteOldOperations()
}, {
    scheduled: true,
    timezone: "Asia/Shanghai"
})
app.listen(80, () => {
    console.log('服务器正在运行:localhost')
})