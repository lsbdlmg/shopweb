//----------------------用户注册-----------------------------
// 验证昵称非空
function nameInput() {
    const name = document.querySelector('.inputName').value;
    const nameError = document.querySelector('#nicknameError');
    if (name.length == 0 || name.length > 7) {
        nameError.textContent = '昵称长度为1-7位';
    } else {
        nameError.textContent = '';
    }
}
// 验证邮箱格式
function EmailInput() {
    const email = document.querySelector('.inputEmail').value;
    const emailError = document.querySelector('#emailError');
    const emailRegex = /^[1-9][0-9]{4,10}@qq\.com$/
    if (!emailRegex.test(email)) {
        emailError.textContent = '请输入正确的邮箱'
    } else {
        emailError.textContent = '';
    }
}
// 验证密码长度
function PasswordInput() {
    const password = document.querySelector('#inputpwd-1').value;
    const passwordError = document.querySelector('#passwordError');
    ConfirmPasswordInput()
    if (password.length < 6 || password.length > 18) {
        passwordError.textContent = '密码应在6-18位';
    } else {
        passwordError.textContent = '';
    }
}
// 验证确认密码是否一致
function ConfirmPasswordInput() {
    const password = document.querySelector('#inputpwd-1').value;
    const confirmPassword = document.querySelector('#inputpwd-2').value;
    const confirmPasswordError = document.querySelector("#confirmPasswordError");
    if (confirmPassword !== password) {
        confirmPasswordError.textContent = '请输入相同的密码';
    } else {
        confirmPasswordError.textContent = '';
    }
}
//验证码是否正确
let randomCode = 0
function CodeInput(Code) {
    const code = document.querySelector('.inputcode').value;
    const codeError = document.querySelector('#codeError');

    if (code != Code || !code) {
        codeError.textContent = '验证码错误';
        return true
    } else {
        codeError.textContent = '';
    }
}
//点击发送验证码
function sendCode(button) {
    //验证邮箱是否正确
    EmailInput();
    //验证邮箱是否已被使用
    isEmailUsed().then(EmailUsed => {
        if (EmailUsed) {
            const emailError = document.querySelector('#emailError')
            emailError.textContent = "该邮箱已被使用"
        }
        else {
            PasswordInput();
            ConfirmPasswordInput();
            nameInput();
            const emailError = document.querySelector('#emailError').textContent;
            const passwordError = document.querySelector('#passwordError').textContent;
            const confirmPasswordError = document.querySelector('#confirmPasswordError').textContent;
            const nameError = document.querySelector('#nicknameError').textContent;
            // 没错就发验证码
            if (!emailError && !passwordError && !confirmPasswordError && !nameError) {
                const email = document.querySelector('#inputEmail').value;
                let clicktime = 1
                button.disabled = true
                button.innerHTML = `${clicktime}后可再次发送验证码`
                let clicktimeinterval = setInterval(function () {
                    clicktime--
                    button.innerHTML = `${clicktime}s后可再次<br>发送验证码`
                    if (clicktime <= 0) {
                        clearInterval(clicktimeinterval)
                        button.disabled = false
                        button.innerHTML = `发送验证码`
                    }
                }, 1000)
                fetch('/sendcode', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            randomCode = data.Code
                            alert("验证码已发送到您的邮箱！");
                            console.log(randomCode)
                        } else {
                            alert("发送验证码失败，请稍后再试！");
                        }
                    })
                    .catch(error => {
                        console.error("Error:", error);
                        alert("发送验证码失败，请稍后再试！");
                    });
            }
        }
    })
}
//点击发送验证码时验证邮箱是否已被使用
async function isEmailUsed() {
    const email = document.querySelector('.inputEmail').value;
    try {
        const response = await fetch('/isEmailUsed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email
            })
        });
        const res = await response.json();
        if (res.success) {
            // 该邮箱已被使用
            return true;
        } else {
            // 该邮箱未被使用
            return false;
        }
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}
function submitForm(event) {
    event.preventDefault();
    EmailInput();
    PasswordInput();
    ConfirmPasswordInput();
    nameInput();
    CodeInput(randomCode);
    const emailError = document.querySelector('#emailError').textContent;
    const passwordError = document.querySelector('#passwordError').textContent;
    const confirmPasswordError = document.querySelector('#confirmPasswordError').textContent;
    const nameError = document.querySelector('#nicknameError').textContent;
    const codeError = document.querySelector('#codeError').textContent;
    if (!emailError && !passwordError && !confirmPasswordError && !nameError && !codeError) {
        isEmailUsed().then(EmailUsed => {
            if (EmailUsed) {
                const emailError = document.querySelector('#emailError')
                emailError.textContent = "该邮箱已被使用"
            }
            else {
                insertUseraccountToDataBase()
            }
        })
    }
}
//提交表单后信息无误后将该用户信息插入到数据库
function insertUseraccountToDataBase() {
    const email = document.querySelector('#inputEmail').value;
    const password = document.querySelector('#inputpwd-1').value;
    const name = document.querySelector('#inputName').value;
    fetch('/Userregister', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password,
            name: name
        })
    })
        .then(response => response.json())
        .then(res => {
            if (res.success) {
                // 登录成功，跳转到登录页
                alert("注册成功！返回登录页面");
                window.location.replace('http://localhost/userlogin.html');
            }
            else {
                // 登录失败，显示错误信息
                alert("注册失败！")
            }
        })
}
//----------------------用户/商家/管理员登录-----------------------------
//用户登录
function userlogin(event) {
    event.preventDefault();
    const Email = document.querySelector('.inputEmail').value
    const pwd = document.querySelector('.inputpwd').value
    fetch('/Userlogin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            Email: Email,
            Password: pwd
        })
    })
        .then(response => response.json())
        .then(res => {
            if (!res.success || !res.data) {
                document.querySelector('.message').innerText = '邮箱或者密码错误'
                return
            }
            let userParams = new URLSearchParams({ who: 'user', name: res.data.uname, Emailtext: Email }).toString()
            window.location.replace(`http://localhost?${userParams}`)
        })
        .catch(error => {
            console.error('登录请求失败:', error)
            document.querySelector('.message').innerText = '登录繁忙，请稍后再试'
        })
}
//商家/管理员登录
function shoplogin(event) {
    event.preventDefault();
    const Email = document.querySelector('.inputEmail').value
    const pwd = document.querySelector('.inputpwd').value
    fetch('/ShopOrManagerlogin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            Email: Email,
            Password: pwd
        })
    })
        .then(response => response.json())
        .then(res => {
            if (!res.success || !res.data) {
                document.querySelector('.message').innerText = '邮箱或者密码错误'
                return
            }
            const { who, sname, email } = res.data
            let role = who == 2 ? 'shop' : who == 1 ? 'manager' : 'nobody'
            let whologin = { who: role, name: sname, Emailtext: email }
            let shopMessage = new URLSearchParams(whologin).toString()
            if (role == 'nobody') {
                document.querySelector('.message').innerText = '无效的用户身份'
                return
            }
            else if (role == 'shop') {
                window.location.replace(`http://localhost/shopindex.html?${shopMessage}`)
            }
            else if (role == 'manager') {
                window.location.replace(`http://localhost/managerindex.html?${shopMessage}`)
            }
        })
        .catch(error => {
            console.error('登录请求失败:', error)
            document.querySelector('.message').innerText = '登录繁忙，请稍后再试'
        })
}
//退出登录
function logout(whologin) {
    const getlogout = document.querySelector('.logout')
    let isLoggingOut = false // 防止重复执行
    // 退出按钮点击事件
    getlogout.addEventListener('click', function () {
        if (isLoggingOut) return
        isLoggingOut = true
        logoutTime()
        window.location.replace('http://localhost')
    })
    // 监听窗口关闭
    window.addEventListener("beforeunload", (event) => {
        console.log(whologin)
        if (isLoggingOut) return
        isLoggingOut = true
        logoutTime()
    }, { once: true })
    // 退出请求
    function logoutTime() {
        try {
            fetch('/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    who: whologin.who,
                    email: whologin.Emailtext,
                    name: whologin.name,
                })
            })
        } catch (err) {
            console.error('数据发送失败:', err);
        }
    }
}

//禁止刷新
function banrefresh() {
    const lastRefresh = sessionStorage.getItem('lastRefresh');
    const currentTime = Date.now();
    // 检查是否在3秒内刷新
    if (lastRefresh && currentTime - lastRefresh < 3000) {
        alert("3秒内无法重复此操作");
        return;
    }
    // 更新刷新时间
    sessionStorage.setItem('lastRefresh', currentTime);
}
//----------------------主页展示商品--------------------------------
//读取并且展示商品（商家用户共用）
async function showProduct(offset, limit, page, whologin) {
    try {
        openModal('loadingOverlay')
        const requestBody = {
            offset,
            limit,
            email: whologin.Emailtext
        }
        const res = whologin.who == 'shop' ? await fetchOrders('/showshopProduct', requestBody) : await fetchOrders('/products', requestBody)
        whologin.who == 'shop' ? await rendershopindexProduct(res.products, res.productslength, page, whologin) : await renderindexProduct(res.products, res.productslength, page, whologin)
        closeModal('loadingOverlay')
    } catch (error) {
        console.error('获取产品数据失败:', error)
    }
}
//前端渲染用户主页商品
async function renderindexProduct(data, productslength, page, whologin) {
    const productbox = document.querySelector('.products')
    productbox.innerHTML = ' '
    if (!data.length) {
        //渲染切换页面按钮
        renderswitchpagebutton(1, productslength)
        //点击按钮切换商品页面
        switchindexpagebutton(whologin)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
    }
    const fragment = document.createDocumentFragment()
    data.forEach(product => {
        const pro = document.createElement('div')
        pro.classList.add('product')
        pro.setAttribute('id', `${product.id}`)
        pro.innerHTML = `
            <img src="${product.image_url}" alt="${product.pname}">
            <div class="Product-name">${product.pname}</div>
            <div class="Product-price">
                <span class="Product-price-symbol">￥</span><span class="Product-price-number">${product.price}</span>
            </div>
            <div class="Product-salesperson-category">
                <span class="Product-salesperson">${product.sname}</span>
                <span class="Product-category">${product.category}</span>
            </div>`
        fragment.appendChild(pro)
    })
    productbox.appendChild(fragment)
    //渲染切换页面按钮
    renderswitchpagebutton(page, productslength)
    //单独查看商品
    GOoneProductshow(whologin)
    //点击按钮切换商品页面
    switchindexpagebutton(whologin)
    window.scrollTo({ top: 0, behavior: 'smooth' })
}
//前端渲染商家主页商品/用户端
async function renderuserinshopindexProduct(data, productslength, page, whologin) {
    const productbox = document.querySelector('.products')
    productbox.innerHTML = ' '
    if (!data.length) {
        //渲染切换页面按钮
        renderswitchpagebutton(1, productslength)
        //点击按钮切换商品页面
        switchuserinshopindexpagebutton(whologin)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
    }
    const fragment = document.createDocumentFragment()
    data.forEach(product => {
        const pro = document.createElement('div')
        pro.classList.add('product')
        pro.setAttribute('id', `${product.id}`)
        pro.innerHTML = `
            <img src="${product.image_url}" alt="${product.pname}">
            <div class="Product-name">${product.pname}</div>
            <div class="Product-price">
                <span class="Product-price-symbol">￥</span><span class="Product-price-number">${product.price}</span>
            </div>
            <div class="Product-salesperson-category">
                <span class="Product-salesperson">${product.sname}</span>
                <span class="Product-category">${product.category}</span>
            </div>`
        fragment.appendChild(pro)
    })
    productbox.appendChild(fragment)
    //渲染切换页面按钮
    renderswitchpagebutton(page, productslength)
    //单独查看商品
    GOoneProductshow(whologin)
    //点击按钮切换商品页面
    switchuserinshopindexpagebutton(whologin)
    window.scrollTo({ top: 0, behavior: 'smooth' })
}
//前端渲染商家主页商品/商家端
async function rendershopindexProduct(data, productslength, page, whologin) {
    const productbox = document.querySelector('.products')
    productbox.innerHTML = ' '
    if (!data.length) {
        //渲染切换页面按钮
        renderswitchpagebutton(1, productslength)
        //点击按钮切换商品页面
        switchindexpagebutton(whologin)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
    }
    const fragment = document.createDocumentFragment()
    data.forEach(product => {
        const pro = document.createElement('div')
        pro.classList.add('product')
        pro.setAttribute('id', `${product.id}`)
        pro.innerHTML = `
            <img src="${product.image_url}" alt="${product.pname}" title="${product.id}">
            <div class="product-shop-options">
                <div class="product-message">
                    <div class="product-id">商品id:[${product.id}]</div>
                    <div class="Product-name">${product.pname}</div>
                    <div class="Product-price">
                        <span class="Product-price-symbol">￥</span><span class="Product-price-number">${product.price}</span>
                    </div>
                    <div class="Product-category">${product.category}</div>
                    <div class="Product-stock">库存：${product.stock}件</div>
                </div>
                <div class="change-message" style="display: none;">
                    <div class="change-name">
                        商品名字<input type="text" min="0" class="change-name-input" value="${product.pname}">
                    </div>
                    <div class="change-price">
                        商品单价<input type="number" step="0.01" min="0" class="change-price-input" value="${product.price}">
                    </div>
                    <div class="change-category">
                        商品类别
                        <select class="change-category-select" value="${product.category}">
                            <option value="数码产品">数码产品</option>
                            <option value="服装">服装</option>
                            <option value="生活用品">生活用品</option>
                            <option value="食品">食品</option>
                        </select>
                    </div>
                    <div class="change-stock">
                        库存数量<input type="number" min="0" class="change-stock-input" value="${product.stock}">
                    </div>
                </div>
                <div class="options">
                    <button class="changepro">更改商品</button>
                    <button class="statuspro" style="display: ${['2', '3'].includes(product.status) ? 'none' : 'block'};">${product.status == 1 ? '下架商品' : '上架商品'}</button>
                    <button class="review" style="display: none;">上传审核</button>
                    <button class="reviewing ${product.status}" style="display: ${['2', '3'].includes(product.status) ? 'block' : 'none'};">${product.status == 2 ? '审核中' : (product.status == 3 ? '审核失败' : ' ')}</button>
                    <div class="reviewfailresult ${product.status}" style="display: ${product.status == 3 ? 'block' : 'none'};">${product.reviewfailresult ? product.reviewfailresult : ''}</div>
                    <button class="uploadimg" style="display: none;">更改图片</button>
                    <button class="cancel" style="display: none;">取消修改</button>
                </div>
            </div>
            `
        fragment.appendChild(pro)
    })
    productbox.appendChild(fragment)
    changepro()
    reviewpro(whologin)
    cancelchange()
    loadproimg()
    statuspro(whologin)
    //渲染切换页面按钮
    renderswitchpagebutton(page, productslength)
    //点击按钮切换商品页面
    switchindexpagebutton(whologin)
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

//搜索商品（商家端/主页用户共用）
function searchindexProduct(whologin) {
    const searchProductbutton = document.querySelector('.nav .searchProduct .searchProductbutton')
    const searchUserInput = document.querySelector('.nav .searchProduct .searchUserinput')
    const categorySelect = document.getElementById('selectProduct')
    async function performSearch() {
        const query = searchUserInput.value.trim()
        const selectedCategory = categorySelect.value
        // 如果既没输入内容，又选择了 "全部"，就查询所有购物车商品
        if (!query && selectedCategory === '全部') {
            showProduct(0, 40, 1, whologin)
            return
        }
        const requestBody = {
            searchUserinput: query,
            category: selectedCategory,
            email: whologin.Emailtext,
            name: whologin.name,
            offset: 0,
            limit: 40
        }
        const res = whologin.who == 'shop' ? await fetchOrders('/searchshopProduct', requestBody) : await fetchOrders('/searchindexProduct', requestBody)
        whologin.who == 'shop' ? rendershopindexProduct(res.data, res.productslength, 1, whologin) : renderindexProduct(res.data, res.productslength, 1, whologin)
    }
    searchProductbutton.addEventListener('click', performSearch)
    searchUserInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            performSearch()
        }
    })
    categorySelect.addEventListener('change', performSearch)
}
//搜索商家商品页面（用户端）
function searchuserinshopindexProduct(whologin) {
    const searchProductbutton = document.querySelector('.nav .searchProduct .searchProductbutton')
    const searchUserInput = document.querySelector('.nav .searchProduct .searchUserinput')
    const categorySelect = document.getElementById('selectProduct')
    async function performSearch() {
        const query = searchUserInput.value.trim()
        const selectedCategory = categorySelect.value
        // 如果既没输入内容，又选择了 "全部"，就查询所有购物车商品
        if (!query && selectedCategory === '全部') {
            userinshopshowProduct(0, 40, 1, whologin)
            return
        }
        const requestBody = {
            searchUserinput: query,
            category: selectedCategory,
            email: whologin.Emailtext,
            salespersonemail: whologin.salespersonemail,
            name: whologin.name,
            offset: 0,
            limit: 40
        }
        const res = await fetchOrders('/searchuserinshopshowProduct', requestBody)
        renderuserinshopindexProduct(res.data, res.productslength, 1, whologin)
    }
    searchProductbutton.addEventListener('click', performSearch)
    searchUserInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            performSearch()
        }
    })
    categorySelect.addEventListener('change', performSearch)
}

//渲染切换页面按钮（商家端/主页用户共用）
function renderswitchpagebutton(page, productslength) {
    const switchpage = document.querySelector('.switch-page');
    switchpage.innerHTML = "" // 清除旧的分页按钮
    let buttonlength = Math.ceil(productslength / 40) // 向上取整，确保有足够的页数
    // “上一页”按钮
    if (page > 1) {
        const beforepagebutton = document.createElement('button')
        beforepagebutton.classList.add('before-page')
        beforepagebutton.innerText = '上一页'
        switchpage.appendChild(beforepagebutton)
    }
    // 数字页码按钮
    for (let i = 1; i <= buttonlength; i++) {
        const switchbutton = document.createElement('button')
        switchbutton.innerText = i
        switchbutton.classList.add('number-page')
        if (i == page) {
            switchbutton.classList.add("active")
            switchbutton.disabled = true
        }
        switchpage.appendChild(switchbutton)
    }
    // “下一页”按钮（仅在当前页小于最大页数时显示）
    if (page < buttonlength) {
        const nextpagebutton = document.createElement('button')
        nextpagebutton.classList.add('next-page')
        nextpagebutton.innerText = '下一页'
        switchpage.appendChild(nextpagebutton)
    }
}
//点击按钮切换商品页面（商家端/主页用户共用）
function switchindexpagebutton(whologin) {
    // 公共的分页请求函数
    async function fetchPageData(pageNum) {
        const searchUserInput = document.querySelector('.nav .searchProduct .searchUserinput')
        const categorySelect = document.getElementById('selectProduct')
        let query
        let selectedCategory
        if (whologin.email) {
            query = searchUserInput.value.trim()
            selectedCategory = categorySelect.value
        } else {
            query = ''
            selectedCategory = '全部'
        }
        const offset = (pageNum - 1) * 40
        const limit = 40
        if (!query && selectedCategory === '全部') {
            await showProduct(offset, limit, pageNum, whologin)
        } else {
            const requestBody = {
                searchUserinput: query,
                category: selectedCategory,
                email: whologin.Emailtext,
                name: whologin.name,
                offset,
                limit
            }
            const res = whologin.who == 'shop' ? await fetchOrders('/searchshopProduct', requestBody) : await fetchOrders('/searchindexProduct', requestBody)
            whologin.who == 'shop' ? rendershopindexProduct(res.data, res.productslength, pageNum, whologin) : renderindexProduct(res.data, res.productslength, pageNum, whologin)
        }
    }
    // 重置按钮事件监听器
    function resetEventListeners(selector, callback) {
        document.querySelectorAll(selector).forEach(button => {
            const newButton = button.cloneNode(true)
            button.replaceWith(newButton)
            newButton.addEventListener('click', callback)
        })
    }
    // 处理页码按钮点击事件
    resetEventListeners('.switch-page .number-page', function () {
        const pageNum = Number(this.innerText)
        fetchPageData(pageNum)
    })
    // 处理上一页按钮
    resetEventListeners('.switch-page .before-page', function () {
        const nowPage = Number(document.querySelector('.switch-page .active').innerText)
        if (nowPage > 1) {
            fetchPageData(nowPage - 1)
        }
    })
    // 处理下一页按钮
    resetEventListeners('.switch-page .next-page', function () {
        const nowPage = Number(document.querySelector('.switch-page .active').innerText)
        fetchPageData(nowPage + 1)
    })
}
//点击按钮切换商家商品页面（用户端）
function switchuserinshopindexpagebutton(whologin) {
    // 公共的分页请求函数
    async function fetchPageData(pageNum) {
        const searchUserInput = document.querySelector('.nav .searchProduct .searchUserinput')
        const categorySelect = document.getElementById('selectProduct')
        const query = searchUserInput.value.trim()
        const selectedCategory = categorySelect.value
        const offset = (pageNum - 1) * 40
        const limit = 40
        if (!query && selectedCategory === '全部') {
            await userinshopshowProduct(offset, limit, pageNum, whologin)
        } else {
            const requestBody = {
                searchUserinput: query,
                category: selectedCategory,
                salespersonemail: whologin.salespersonemail,
                email: whologin.Emailtext,
                name: whologin.name,
                offset,
                limit
            }
            const res = await fetchOrders('/searchuserinshopshowProduct', requestBody)
            renderuserinshopindexProduct(res.data, res.productslength, pageNum, whologin)
        }
    }
    // 重置按钮事件监听器
    function resetEventListeners(selector, callback) {
        document.querySelectorAll(selector).forEach(button => {
            const newButton = button.cloneNode(true)
            button.replaceWith(newButton)
            newButton.addEventListener('click', callback)
        })
    }
    // 处理页码按钮点击事件
    resetEventListeners('.switch-page .number-page', function () {
        const pageNum = Number(this.innerText)
        fetchPageData(pageNum)
    })
    // 处理上一页按钮
    resetEventListeners('.switch-page .before-page', function () {
        const nowPage = Number(document.querySelector('.switch-page .active').innerText)
        if (nowPage > 1) {
            fetchPageData(nowPage - 1)
        }
    })
    // 处理下一页按钮
    resetEventListeners('.switch-page .next-page', function () {
        const nowPage = Number(document.querySelector('.switch-page .active').innerText)
        fetchPageData(nowPage + 1)
    })
}
//点击按钮切换待审核商品
function switchManagerindexpagebutton(whologin) {
    // 公共的分页请求函数
    async function fetchPageData(pageNum) {
        const offset = (pageNum - 1) * 40
        const limit = 40
        const requestBody = {
            email: whologin.Emailtext,
            name: whologin.name,
            offset,
            limit
        }
        const res = await fetchOrders('/managershowProduct', requestBody)
        rendermanagerProduct(res.products, res.productslength, pageNum, whologin)
    }

    // 重置按钮事件监听器
    function resetEventListeners(selector, callback) {
        document.querySelectorAll(selector).forEach(button => {
            const newButton = button.cloneNode(true)
            button.replaceWith(newButton)
            newButton.addEventListener('click', callback)
        })
    }
    // 处理页码按钮点击事件
    resetEventListeners('.switch-page .number-page', function () {
        const pageNum = Number(this.innerText)
        fetchPageData(pageNum)
    })
    // 处理上一页按钮
    resetEventListeners('.switch-page .before-page', function () {
        const nowPage = Number(document.querySelector('.switch-page .active').innerText)
        if (nowPage > 1) {
            fetchPageData(nowPage - 1)
        }
    })
    // 处理下一页按钮
    resetEventListeners('.switch-page .next-page', function () {
        const nowPage = Number(document.querySelector('.switch-page .active').innerText)
        fetchPageData(nowPage + 1)
    })
}
//----------------------商家页面/商家端--------------------------------
//修改商品按钮
function changepro() {
    document.querySelectorAll('.product .options .changepro').forEach(button => {
        button.addEventListener('click', function () {
            const product = button.closest('.product')
            const productImage = product.querySelector('img')
            const pname = product.querySelector('.Product-name')
            const price = product.querySelector('.Product-price .Product-price-number')
            const category = product.querySelector('.Product-category')
            const stock = product.querySelector('.Product-stock')
            const stockText = stock.innerText;
            const stockNumber = stockText.match(/\d+/)
            const stockValue = stockNumber ? parseInt(stockNumber[0]) : 0
            // 保存修改前的信息
            product.dataset.originalImage = productImage.src
            product.dataset.originalName = pname.innerText
            product.dataset.originalPrice = price.innerText
            product.dataset.originalCategory = category.innerText
            product.dataset.originalStock = stockValue
            // 显示修改框
            const changemessage = product.querySelector('.change-message')
            const productmessagens = product.querySelector('.product-message')
            productmessagens.style.display = 'none'
            changemessage.style.display = 'flex'
            // 填充当前值到修改框
            changemessage.querySelector('.change-name-input').value = pname.innerText
            changemessage.querySelector('.change-price-input').value = price.innerText
            changemessage.querySelector('.change-category-select').value = category.innerText
            changemessage.querySelector('.change-stock-input').value = stockValue
            // 隐藏相关按钮
            const options = product.querySelector('.options')
            const reviewfailresult = options.querySelector('.reviewfailresult')
            reviewfailresult.style.display = 'none'
            options.querySelectorAll('button').forEach(button => {
                const targetClasses = ['changepro', 'reviewing', 'statuspro']
                if (targetClasses.some(className => button.classList.contains(className))) {
                    button.style.display = 'none'
                } else {
                    button.style.display = 'block'
                }
            })
        })
    })
}
//上传审核按钮
function reviewpro(whologin) {
    document.querySelectorAll('.product .options .review').forEach(reviewprobutton => {
        reviewprobutton.addEventListener('click', async function () {
            const options = reviewprobutton.closest('.options')
            const reviewfailresult = options.querySelector('.reviewfailresult')
            reviewfailresult.style.display = 'none'
            const reviewing = options.querySelector('.reviewing')
            reviewing.innerText = '审核中'
            const product = reviewprobutton.closest('.product')
            const productshopoptions = reviewprobutton.closest('.product-shop-options')
            const changemessage = productshopoptions.querySelector('.change-message')
            const productmessagens = productshopoptions.querySelector('.product-message')
            productmessagens.style.display = 'flex'
            const pname = productmessagens.querySelector('.Product-name')
            const image_url = product.querySelector('img').src
            const price = productmessagens.querySelector('.Product-price .Product-price-number')
            const category = productmessagens.querySelector('.Product-category')
            const stock = productmessagens.querySelector('.Product-stock')
            changemessage.style.display = 'none'
            const newpname = changemessage.querySelector('.change-name-input').value
            const newprice = changemessage.querySelector('.change-price-input').value
            const newcategory = changemessage.querySelector('.change-category-select').value
            const newstock = changemessage.querySelector('.change-stock-input').value
            pname.innerText = newpname
            price.innerText = (isNaN(newprice) || newprice < 0 || !newprice) ? 0 : newprice
            category.innerText = newcategory
            stock.innerText = `库存：${(isNaN(newstock) || newstock < 0 || !newstock) ? 0 : parseInt(newstock)}件`
            options.querySelectorAll('button').forEach(button => {
                const targetClasses = ['changepro', 'reviewing', 'statuspro']
                if (targetClasses.some(className => button.classList.contains(className))) {
                    button.style.display = 'block'
                }

                else button.style.display = 'none'
            })
            try {
                const requestBody = {
                    name: whologin.name,
                    pname: newpname,
                    price: (isNaN(newprice) || newprice < 0 || !newprice) ? 0 : newprice,
                    category: newcategory,
                    stock: (isNaN(newstock) || newstock < 0 || !newstock) ? 0 : parseInt(newstock),
                    image_url: image_url,
                    email: whologin.Emailtext,
                    proID: product.getAttribute('id'),
                    temporaryimg
                }
                const res = await fetchOrders('/reviewpro', requestBody)
                temporaryimg = []
                const message = document.querySelector('#successOverlay p')
                message.innerText = res.message
                options.querySelector('.statuspro').style.display = 'none'
                options.querySelector('.reviewing').style.display = 'block'

                openModal('successOverlay')
            } catch (error) {
                console.error('获取产品数据失败:', error)
            }
        })
    })
}
//取消修改按钮
function cancelchange() {
    document.querySelectorAll('.product .options .cancel').forEach(button => {
        button.addEventListener('click', function () {
            const product = button.closest('.product')
            const changemessage = product.querySelector('.change-message')
            const productmessagens = product.querySelector('.product-message')
            // 恢复修改前的信息
            const pname = product.querySelector('.Product-name')
            const price = product.querySelector('.Product-price .Product-price-number')
            const category = product.querySelector('.Product-category')
            const stock = product.querySelector('.Product-stock')
            const image_url = product.querySelector('img').src

            pname.innerText = product.dataset.originalName;
            price.innerText = product.dataset.originalPrice;
            category.innerText = product.dataset.originalCategory;
            stock.innerText = `库存：${product.dataset.originalStock}件`
            product.querySelector('img').src = product.dataset.originalImage
            // 恢复视图
            changemessage.style.display = 'none'
            productmessagens.style.display = 'flex'
            // 获取产品的选项区域
            const options = product.querySelector('.options')
            const reviewfailresult = options.querySelector('.reviewfailresult')
            reviewfailresult.style.display = 'block'
            // 获取 `.reviewing` 元素的类名，并进行条件判断
            const targetClasses = options.querySelector('.reviewing').classList.contains('2') || options.querySelector('.reviewing').classList.contains('3')
                ? ['changepro', 'reviewing']
                : ['changepro', 'statuspro']
            // 获取所有按钮，并根据 targetClasses 判断是否显示
            options.querySelectorAll('button').forEach(button => {
                button.style.display = targetClasses.some(className => button.classList.contains(className)) ? 'block' : 'none'
            })
            const requestBody = {
                temporaryimg,
                newimage_url: product.dataset.originalImage
            }
            fetchOrders('/deletenewimg', requestBody)
            temporaryimg = []
        })
    })
}
let temporaryimg = []
// 上传图片按钮
function loadproimg() {
    const imguploadbutton = document.querySelectorAll('.product .options .uploadimg')
    imguploadbutton.forEach(button => {
        button.addEventListener('click', function (event) {
            // 创建一个隐藏的文件输入框
            const fileInput = document.createElement('input')
            fileInput.type = 'file'
            fileInput.accept = 'image/*'// 限制选择图片文件
            fileInput.style.display = 'none'
            // 将文件输入框加入到按钮所在的父元素中
            button.parentElement.appendChild(fileInput)
            // 触发文件选择对话框
            fileInput.click()
            // 监听文件选择事件
            fileInput.addEventListener('change', function (event) {
                const product = button.closest('.product')
                const file = event.target.files[0]
                if (file) {
                    const newimg = new FormData()
                    newimg.append('image', file)
                    fetch('/uploadimg', {
                        method: 'POST',
                        body: newimg
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // 更新商品图片的 src，使用服务器返回的图片路径
                                product.querySelector('img').src = data.filePath;
                                temporaryimg.push(data.filePath)
                            } else {
                                alert('图片上传失败')
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error)
                        })
                }
                // 删除文件输入框，避免每次点击都添加新的文件输入框
                fileInput.remove()
            })
        })
    })
}
//下架按钮/上架按钮
function statuspro(whologin) {
    document.querySelectorAll('.product .options .statuspro').forEach(statusprobutton => {
        statusprobutton.addEventListener('click', async function () {
            const message = document.querySelector('#successOverlay p')
            const options = statusprobutton.closest('.options')
            const product = statusprobutton.closest('.product')
            const stock = product.querySelector('.Product-stock')
            const stockText = stock.innerText;
            const stockNumber = stockText.match(/\d+/)
            const stockValue = stockNumber ? parseInt(stockNumber[0]) : 0
            let role = statusprobutton.innerText == '上架商品'
            if (stockValue <= 0 && role) {
                message.innerText = '商品库存不足'
                openModal('successOverlay')
                return
            }
            try {
                const requestBody = {
                    name: whologin.name,
                    email: whologin.Emailtext,
                    proID: product.getAttribute('id'),
                    status: role ? 1 : 0,
                }
                const res = await fetchOrders('/statuspro', requestBody)
                message.innerText = res.message
                statusprobutton.innerText = role ? '下架商品' : '上架商品'
                openModal('successOverlay')
            } catch (error) {
                console.error('获取产品数据失败:', error)
            }
        })
    })
}
//前端渲染订单数据
function renderShopOrders(orders, whologin) {
    const ordersBody = document.querySelector('.orders .orders-body .orders-body-body');
    ordersBody.innerHTML = ' '
    if (!orders.length) return
    const fragment = document.createDocumentFragment()
    orders.forEach(order => {
        const orderMessage = document.createElement('div')
        orderMessage.classList.add('order-message')
        orderMessage.innerHTML = `
            <div class="order-message-nav">
                <div class="order-time">订单时间：${order.Ordertime}</div>
                <div class="order-id" id="${order.OrderId}">订单号: ${order.OrderId}</div>
                <div class="useremail ${order.useremail}">用户邮箱：${order.useremail}</div>
                <div class="category">${order.category}</div>
            </div>
            <div class="order-message-body">
                <div class="order-detail">
                    <img src="${order.image_url}" alt="${order.pname}" class="${order.id}">
                    <div class="order-name">${order.pname}</div>
                </div>
                <div class="order-price">¥${(order.price * order.count).toFixed(2)}</div>
                <div class="order-count">${order.count}</div>
                <div class="order-status">${order.status == 1 ? '订单已完成' : '待发货'}</div>
                <div class="option">${order.status == 1 ? '' : '<button title="发货">发货</button></div>'}
            </div>`
        fragment.appendChild(orderMessage)
    })
    ordersBody.appendChild(fragment)
    sendOrder(whologin)
}
//请求商家订单数据
async function showShoporder(whologin) {
    try {
        const requestBody = {
            name: whologin.name,
            email: whologin.Emailtext
        }
        const res = await fetchOrders('/showShoporder', requestBody)
        renderShopOrders(res.data, whologin)
    } catch (error) {
        console.error('获取产品数据失败:', error)
    }
}
//发货
function sendOrder(whologin) {
    document.querySelectorAll('.orders .orders-body-body .option button').forEach(Element => {
        Element.addEventListener('click', async function () {
            const ordermessage = Element.closest('.order-message')
            const orderid = ordermessage.querySelector('.order-id')
            const useremail = ordermessage.querySelector('.useremail')
            const ordername = ordermessage.querySelector('.order-name').innerText
            const option = ordermessage.querySelector('.option')
            const orderstatus = ordermessage.querySelector('.order-status')

            try {
                const requestBody = {
                    name: whologin.name,
                    email: whologin.Emailtext,
                    OrderId: orderid.getAttribute('id'),
                    useremail: useremail.classList[1],
                    ordername
                }
                const res = await fetchOrders('/sendOrder', requestBody)
                const message = document.querySelector('#successOverlay p')
                message.innerText = res.message
                if (res.success) {
                    orderstatus.innerText = '订单已完成'
                    option.remove(Element)
                }
                openModal('successOverlay')
            } catch (error) {
                console.error('获取产品数据失败:', error)
            }
        })
    })
}
//点击不同状态订单的按钮
function setupShopOrder(whologin) {
    const ordersNav = document.querySelector('.orders .orders-head-nav')
    ordersNav.addEventListener('click', (event) => {
        if (event.target.matches('.allorder')) {
            checkshopOrderStatus(whologin)
        } else if (event.target.matches('.wait-out')) {
            checkshopOrderStatus(whologin, 0)
        } else if (event.target.matches('.wait-in')) {
            checkshopOrderStatus(whologin, 1)
        }
    })
}
//向后端请求不同状态的订单数据
async function checkshopOrderStatus(whologin, status = null) {
    const url = status === null ? '/showShoporder' : '/checkshoporderfetch'
    const requestBody = {
        name: whologin.name,
        email: whologin.Emailtext,
        ...(status !== null && { status })
    }
    const res = await fetchOrders(url, requestBody)
    renderShopOrders(res.data, whologin)
}
//搜索订单 
function searchshoporder(whologin) {
    const searchOrderButton = document.querySelector('.orders .orders-head-nav .search-order .search-orderbutton')
    const searchUserInput = document.querySelector('.orders .orders-head-nav .search-order .searchUserinput')
    const categorySelect = document.getElementById('select-order')
    async function performSearch() {
        const query = searchUserInput.value.trim()
        const selectedCategory = categorySelect.value
        // 如果既没输入内容，又选择了 "全部"，就查询所有订单
        if (!query && selectedCategory === '全部') {
            checkshopOrderStatus(whologin)
            return
        }
        const requestBody = {
            searchUserinput: query,
            category: selectedCategory,
            name: whologin.name,
            email: whologin.Emailtext
        }
        const res = await fetchOrders('/searchshoporder', requestBody)
        renderShopOrders(res.data, whologin)
    }
    searchOrderButton.addEventListener('click', performSearch)
    searchUserInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            performSearch()
        }
    })
    categorySelect.addEventListener('change', performSearch)
}
//添加商品
function addproduct(whologin) {
    document.querySelector('.nav .addproduct').addEventListener('click', function () {
        openModal('addproductOverlay')
    })
    document.querySelector('.addproduct-box .preview').addEventListener("click", function () {
        document.querySelector('.addproduct-box .imageUpload').click()
    })
    document.querySelector('.addproduct-box .imageUpload').addEventListener("change", function (event) {
        const file = event.target.files[0]
        if (file) {
            const newimg = new FormData()
            newimg.append('image', file)
            fetch('/uploadimg', {
                method: 'POST',
                body: newimg
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // 更新商品图片的 src，使用服务器返回的图片路径
                        document.querySelector('.addproduct-box .preview').innerHTML = `<img src="${data.filePath}" alt="商品图片">`
                    } else {
                        const message = document.querySelector('#successOverlay p')
                        message.innerText = '商品上传失败'
                        openModal('successOverlay')
                    }
                })
                .catch(error => {
                    console.error('Error:', error)
                })

        }
    })
    document.querySelector('.addproduct-box .buttons .cancelButton').addEventListener("click", function () {
        document.querySelector('.addproduct-box .imageUpload').value = ""
        document.querySelector('.addproduct-box .preview').innerHTML = "点击上传图片"
        document.querySelector('.addproduct-box .productName').value = ""
        document.querySelector('.addproduct-box .productPrice').value = ""
        document.querySelector('.addproduct-box .productStock').value = ""
        document.querySelector('.addproduct-box .productCategory').selectedIndex = 0
        closeModal('addproductOverlay')
    })
    document.querySelector('.addproduct-box .buttons .uploadButton').addEventListener("click", async function () {
        const productName = document.querySelector('.addproduct-box .productName').value
        const productPrice = parseFloat(document.querySelector('.addproduct-box .productPrice').value)
        const productStock = parseFloat(document.querySelector('.addproduct-box .productStock').value)
        const productCategory = document.querySelector('.addproduct-box .productCategory').value
        const productImage = document.querySelector('.addproduct-box .imageUpload').files.length
        const message = document.querySelector('#successOverlay p')
        // 检查商品价格
        if (isNaN(productPrice) || productPrice < 0) {
            document.querySelector('.addproduct-box .productPrice').value = "0"
            message.innerText = '请输入合理的价格'
            openModal('successOverlay')
            return
        }
        // 检查库存数量
        if (isNaN(productStock) || productStock < 0) {
            message.innerText = '请输入合理的库存'
            openModal('successOverlay')
            document.querySelector('.addproduct-box .productStock').value = "0"
            return
        }
        // 检查是否上传了图片
        if (productImage === 0) {
            message.innerText = '请上传图片'
            openModal('successOverlay')
            return
        }
        const image_url = document.querySelector('.addproduct-box .preview img').src
        const requestBody = {
            pname: productName,
            price: productPrice,
            category: productCategory,
            stock: Math.ceil(productStock),
            image_url,
            name: whologin.name,
            email: whologin.Emailtext
        }
        const res = await fetchOrders('/addproduct', requestBody)
        message.innerText = res.message
        if (res.success) {
            closeModal('addproductOverlay')
            openModal('successOverlay')
            document.querySelector('.addproduct-box .imageUpload').value = ""
            document.querySelector('.addproduct-box .preview').innerHTML = "点击上传图片"
            document.querySelector('.addproduct-box .productName').value = ""
            document.querySelector('.addproduct-box .productPrice').value = ""
            document.querySelector('.addproduct-box .productStock').value = ""
            document.querySelector('.addproduct-box .productCategory').selectedIndex = 0
        } else {
            openModal('successOverlay')
        }
    })
}
//----------------------商家页面/用户端--------------------------------
//读取并且展示商品（商家用户共用）
async function userinshopshowProduct(offset, limit, page, whologin) {
    try {
        const requestBody = {
            offset,
            limit,
            name: whologin.name,
            email: whologin.Emailtext,
            salespersonemail: whologin.salespersonemail
        }
        const res = await fetchOrders('/userinshopshowProduct', requestBody)
        renderuserinshopindexProduct(res.products, res.productslength, page, whologin)

    } catch (error) {
        console.error('获取产品数据失败:', error)
    }
}
//----------------------管理员页面--------------------------------
//读取并且展示待审核商品
async function managershowProduct(offset, limit, page, whologin) {
    try {
        const requestBody = {
            offset,
            limit,
            name: whologin.name,
            email: whologin.Emailtext,
        }
        const res = await fetchOrders('/managershowProduct', requestBody)
        rendermanagerProduct(res.products, res.productslength, page, whologin)

    } catch (error) {
        console.error('获取产品数据失败:', error)
    }
}
//前端渲染待审核的商品
async function rendermanagerProduct(data, productslength, page, whologin) {
    const productbox = document.querySelector('.products')
    productbox.innerHTML = ' '
    if (!data.length) {
        //渲染切换页面按钮
        renderswitchpagebutton(1, productslength)
        //点击按钮切换商品页面
        switchManagerindexpagebutton(whologin)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
    }
    const fragment = document.createDocumentFragment()
    data.forEach(product => {
        const pro = document.createElement('div')
        pro.classList.add('product')
        pro.setAttribute('id', `${product.id}`)
        pro.innerHTML = `
            <img src="${product.image_url}" alt="${product.pname}">
            <div class="product-shop-options">
                <div class="product-message">
                    <div class="Product-name">${product.pname}</div>
                    <div class="Product-price">
                        <span class="Product-price-symbol">￥</span><span class="Product-price-number">${product.price}</span>
                    </div>
                    <div class="Product-category">${product.category}</div>
                    <div class="Product-stock">库存：${product.stock}件</div>
                </div>
                <div class="change-message" style="display: none;">
                    <div class="change-name">
                        商品名字<input type="text" min="0" class="change-name-input" value="${product.pname}">
                    </div>
                    <div class="change-price">
                        商品单价<input type="number" step="0.01" min="0" class="change-price-input" value="${product.price}">
                    </div>
                    <div class="change-category">
                        商品类别
                        <select class="change-category-select" value="${product.category}">
                            <option value="数码产品">数码产品</option>
                            <option value="服装">服装</option>
                            <option value="生活用品">生活用品</option>
                            <option value="食品">食品</option>
                        </select>
                    </div>
                    <div class="change-stock">
                        库存数量<input type="number" min="0" class="change-stock-input" value="${product.stock}">
                    </div>
                </div>
                <div class="options">
                    <button class="reviewsuccess">审核通过</button>
                    <button class="reviewfail">驳回审核</button>
                </div>
            </div>
            `
        fragment.appendChild(pro)
    })
    productbox.appendChild(fragment)
    //渲染切换页面按钮
    renderswitchpagebutton(page, productslength)
    //点击按钮切换商品页面
    switchManagerindexpagebutton(whologin)
    //商品审核按钮
    reviewingproduct(whologin)
    window.scrollTo({ top: 0, behavior: 'smooth' })
}
//读取商家信息
async function managershowshop(whologin) {
    try {
        const requestBody = {
            name: whologin.name,
            email: whologin.Emailtext,
        }
        const res = await fetchOrders('/managershowshop', requestBody)
        rendermanagershop(res.data, whologin)
    } catch (error) {
        console.error('获取产品数据失败:', error)
    }
}
//渲染商家信息
function rendermanagershop(data, whologin) {
    const shopaccount = document.querySelector('.shopaccount .shopaccount-body .shopaccount-body-body')
    shopaccount.innerHTML = ' '
    if (!data.length) {
        return
    }
    const fragment = document.createDocumentFragment()
    data.forEach(shop => {
        const shopmessage = document.createElement('div')
        shopmessage.classList.add('shopmessage')
        shopmessage.setAttribute('id', `${shop.email}`)
        shopmessage.innerHTML = `
            <div class="shopemail">${shop.email}</div>
            <div class="shopname">${shop.sname}</div>
            <div class="reset">
                <button class="resetbutton">重置密码</button>
            </div>
            <div class="delete">
                <button class="deleteshop">删除商家</button>
            </div>`
        fragment.appendChild(shopmessage)
    })
    shopaccount.appendChild(fragment)
    resetshoppwd(whologin)
}
//搜索商家
function searchshopaccount(whologin) {
    const searchShopbutton = document.querySelector('.shopaccount .searchShop .searchShopbutton')
    const searchUserInput = document.querySelector('.shopaccount .searchShop .searchUserinput')
    async function performSearch() {
        const query = searchUserInput.value.trim()
        if (!query) {
            managershowshop(whologin)
            return
        }
        const requestBody = {
            searchUserinput: query,
            email: whologin.Emailtext,
            name: whologin.name,
        }
        const res = await fetchOrders('/searchshopaccount', requestBody)
        rendermanagershop(res.data, whologin)
    }
    searchShopbutton.addEventListener('click', performSearch)
    searchUserInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            performSearch()
        }
    })
}
//查看不同状态的商家
async function checkShopStatus(whologin, status = null) {
    const url = status === null ? '/managershowshop' : '/checkShopStatus'
    const requestBody = {
        name: whologin.name,
        email: whologin.Emailtext,
        ...(status !== null && { status })
    }
    const res = await fetchOrders(url, requestBody)
    rendermanagershop(res.data, whologin)
}
// //点击不同状态的商家的按钮
// function setupShopEventListeners(whologin) {
//     const ordersNav = document.querySelector('.shopaccount .shopaccount-head')
//     ordersNav.addEventListener('click', (event) => {
//         if (event.target.matches('.allshop')) {
//             checkShopStatus(whologin)
//         } else if (event.target.matches('.onwork')) {
//             checkShopStatus(whologin, 2)
//         }
//         // else if (event.target.matches('.outwork')) {
//         //     checkShopStatus(whologin, 3)
//         // }
//     })
// }
//商品审核
function reviewingproduct(whologin) {
    const reviewsuccessbuttons = document.querySelectorAll('.products .product .product-shop-options .options .reviewsuccess')
    const reviewfailbuttons = document.querySelectorAll('.products .product .product-shop-options .options .reviewfail')
    const message = document.querySelector('#successOverlay p')
    reviewsuccessbuttons.forEach(button => {
        button.addEventListener('click', async function () {
            const product = button.closest('.product')
            const requestBody = {
                name: whologin.name,
                email: whologin.Emailtext,
                proId: product.getAttribute('id'),
                status: 1
            }
            const res = await fetchOrders('reviewingproduct', requestBody)
            message.innerText = res.message
            if (res.success) {
                product.remove()
            }
            openModal('successOverlay')
        })
    })
    reviewfailbuttons.forEach(button => {
        button.addEventListener('click', function () {
            const product = button.closest('.product')
            const pnameElement = product.querySelector('.product-message .Product-name')
            const productreviewboxpname = document.querySelector('#productreviewOverlay p')
            const confirmbutton = document.querySelector('#productreviewOverlay .confirm-btn')
            productreviewboxpname.innerText = `商品名：${pnameElement.textContent.trim()}`
            openModal('productreviewOverlay')
            confirmbutton.replaceWith(confirmbutton.cloneNode(true))
            const newConfirmButton = document.querySelector('#productreviewOverlay .confirm-btn')
            newConfirmButton.addEventListener('click', async function () {
                const inputquery = document.querySelector('#productreviewOverlay input').value.trim()
                const requestBody = {
                    name: whologin.name,
                    email: whologin.Emailtext,
                    proId: product.getAttribute('id'),
                    status: 3,
                    inputquery: inputquery ? inputquery : '无'
                }
                const res = await fetchOrders('reviewingproduct', requestBody)
                message.innerText = res.message
                if (res.success) {
                    product.remove()
                    closeModal('productreviewOverlay')
                }
                openModal('successOverlay')
            })
        })
    })

}
//重置商家密码/删除商家
function resetshoppwd(whologin) {
    const resetpwdOverlay = document.querySelector('#resetpwdOverlay')
    const resetpwdMessage = resetpwdOverlay.querySelector('p')
    const resetpwdTitle = resetpwdOverlay.querySelector('h2')
    let confirmButton = resetpwdOverlay.querySelector('.confirm-btn')
    document.querySelectorAll('.shopaccount .shopmessage .resetbutton, .shopaccount .shopmessage .deleteshop')
        .forEach(button => {
            button.addEventListener('click', function () {
                const shopmessage = button.closest('.shopmessage')
                const shopemail = shopmessage.getAttribute("id")
                const isReset = button.classList.contains('resetbutton')
                resetpwdTitle.innerText = isReset ? '重置密码' : '删除商家'
                resetpwdMessage.innerText = `商家邮箱：${shopemail}`
                const newConfirmButton = confirmButton.cloneNode(true)
                newConfirmButton.innerText = isReset ? '确定重置' : '确认删除'
                confirmButton.replaceWith(newConfirmButton)
                confirmButton = newConfirmButton
                newConfirmButton.addEventListener('click', async function () {
                    const message = document.querySelector('#successOverlay p')
                    const requestBody = {
                        name: whologin.name,
                        email: whologin.Emailtext,
                        shopemail: shopemail
                    }
                    const res = await fetchOrders(isReset ? 'resetshoppwd' : 'deleteshop', requestBody)
                    message.innerText = res.message
                    if (res.success) {
                        closeModal('resetpwdOverlay')
                        if (!isReset) {
                            shopmessage.remove()
                        }
                    }
                    openModal('successOverlay')
                })
                openModal('resetpwdOverlay')
            })
        })
}
//添加商家
function addshop(whologin) {
    const addshopbutton = document.querySelector('.shopaccount .shopaccount-head .addshop')
    const uploadButton = document.querySelector('#addshopOverlay .uploadButton')
    addshopbutton.addEventListener('click', function () {
        const shopname = document.querySelector('#addshopOverlay .shopname');
        const shopemail = document.querySelector('#addshopOverlay .shopemail');
        const shoppwd = document.querySelector('#addshopOverlay .shoppwd');
        shopname.value = ''
        shopemail.value = ''
        shoppwd.value = ''
        openModal('addshopOverlay')
    })
    uploadButton.addEventListener('click', async function () {
        const message = document.querySelector('#successOverlay p');
        const shopname = document.querySelector('#addshopOverlay .shopname');
        const shopemail = document.querySelector('#addshopOverlay .shopemail');
        const shoppwd = document.querySelector('#addshopOverlay .shoppwd');
        const shopnameValue = shopname.value.trim()
        const shopemailValue = shopemail.value.trim()
        const shoppwdValue = shoppwd.value.trim()
        if (!shopnameValue || !shopemailValue || !shoppwdValue) {
            message.innerText = `请输入完整的商家信息`
            openModal('successOverlay')
            return
        }
        const qqEmailRegex = /^[1-9][0-9]{4,10}@qq\.com$/
        if (!qqEmailRegex.test(shopemailValue)) {
            message.innerText = `请输入有效的 QQ 邮箱`
            openModal('successOverlay')
            return
        }
        if (shoppwdValue.length < 6 || shoppwdValue.length > 18) {
            message.innerText = `密码长度必须在 6-18 位之间`
            openModal('successOverlay')
            return
        }
        const requestBody = {
            name: whologin.name,
            email: whologin.Emailtext,
            shopemail: shopemailValue,
            shoppwd: shoppwdValue,
            shopname: shopnameValue
        }
        const res = await fetchOrders('addshop', requestBody)
        message.innerText = res.message
        if (res.success) {
            closeModal('addshopOverlay')
        }
        openModal('successOverlay')
    })
}

//----------------------遮罩层---------------------------
function openModal(id) {
    document.getElementById(id).classList.add("active");
}
function closeModal(id) {
    document.getElementById(id).classList.remove("active")
}
function finishLoading() {
    closeModal("loadingOverlay") // 关闭加载层
    openModal("successOverlay")// 显示成功提示框
}
//----------------------用户历史订单--------------------------------
//向后端请求数据（多个函数公用）
async function fetchOrders(url, requestBody) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })
        return await response.json()
    } catch (error) {
        console.error('获取订单失败:', error)
        return { success: false, data: [] }
    }
}
//前端渲染订单数据
function renderOrders(orders, whologin) {
    const ordersBody = document.querySelector('.orders .orders-body .orders-body-body');
    ordersBody.innerHTML = ' '
    if (!orders.length) return
    const fragment = document.createDocumentFragment()
    orders.forEach(order => {
        const orderMessage = document.createElement('div')
        orderMessage.classList.add('order-message')
        orderMessage.innerHTML = `
            <div class="order-message-nav ${order.category}">
                <div class="order-time">订单时间：${order.Ordertime}</div>
                <div class="order-id" id="${order.OrderId}">订单号: ${order.OrderId}</div>
                <div class="category">${order.category}</div>
            </div>
            <div class="order-message-body">
                <div class="order-detail">
                    <img src="${order.image_url}" alt="${order.pname}" class="${order.id}">
                    <div class="order-name">${order.pname}</div>
                </div>
                <div class="order-price">¥${(order.price * order.count).toFixed(2)}</div>
                <div class="order-count">${order.count}</div>
                <div class="order-status">${order.status == 1 ? '待收货' : '待发货'}</div>
                <div class="option"><button title="删除">×</button></div>
            </div>`
        fragment.appendChild(orderMessage)
    })
    ordersBody.appendChild(fragment)
    ordergoproduct(whologin)
    deleteorder(whologin)
}
//订单页面初始化
async function showUserorder(whologin) {
    const res = await fetchOrders('/showUserorder', {
        name: whologin.name,
        email: whologin.Emailtext
    })
    renderOrders(res.data, whologin)
}
//向后端请求不同状态的订单数据
async function checkOrderStatus(whologin, status = null) {
    const url = status === null ? '/showUserorder' : '/checkorderfetch'
    const requestBody = {
        name: whologin.name,
        email: whologin.Emailtext,
        ...(status !== null && { status })
    }
    const res = await fetchOrders(url, requestBody)
    renderOrders(res.data, whologin)
}
//点击不同状态订单的按钮
function setupOrderEventListeners(whologin) {
    const ordersNav = document.querySelector('.orders .orders-head-nav')
    ordersNav.addEventListener('click', (event) => {
        if (event.target.matches('.allorder')) {
            checkOrderStatus(whologin)
        } else if (event.target.matches('.wait-out')) {
            checkOrderStatus(whologin, 0)
        } else if (event.target.matches('.wait-in')) {
            checkOrderStatus(whologin, 1)
        }
    })
}
// 删除订单
function deleteorder(whologin) {
    const deletebuttons = document.querySelectorAll('.orders-body-body .order-message .order-message-body .option button')
    deletebuttons.forEach(button => {
        button.addEventListener('click', async function () {
            const ordermessage = button.closest('.order-message')
            const status = ordermessage.querySelector('.order-message-body .order-status').innerText
            const message = document.querySelector('#successOverlay p')
            if (status === '待发货') {
                message.innerText = `订单待发货，无法删除`
                openModal('successOverlay')
                return
            }
            openModal('loadingOverlay')
            const orderIdElement = ordermessage.querySelector('.order-message-nav .order-id')
            const orderId = orderIdElement.textContent.replace('订单号:', '').trim()
            try {
                const response = await fetch('/deleteorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: whologin.name,
                        email: whologin.Emailtext,
                        OrderId: orderId
                    })
                })
                const res = await response.json()
                if (res.success) {
                    message.innerText = res.message;
                    setTimeout(() => {
                        document.querySelector('.orders-body-body').removeChild(ordermessage)
                        finishLoading()
                    }, 1000)
                } else {
                    message.innerText = res.message
                    setTimeout(() => {
                        finishLoading()
                    }, 1000)
                }
            } catch (error) {
                console.error('删除订单失败:', error)
                message.innerText = '网络异常，请稍后再试'
                setTimeout(() => {
                    finishLoading()
                }, 1000)
            }
        })
    })
}
//点击图片跳转商品页面
function ordergoproduct(whologin) {
    const orderimg = document.querySelectorAll('.orders-body-body .order-message .order-message-body .order-detail img')
    orderimg.forEach(Element => {
        Element.addEventListener('click', function () {
            let proID = {
                name: whologin.name,
                ID: Element.className,
                Emailtext: whologin.Emailtext
            }
            let pro = new URLSearchParams(proID).toString()
            window.open(`http://localhost/productshow.html?${pro}`, '_blank');
        })
    })
}
//搜索订单 
function searchorder(whologin) {
    const searchOrderButton = document.querySelector('.orders .orders-head-nav .search-order .search-orderbutton')
    const searchUserInput = document.querySelector('.orders .orders-head-nav .search-order .searchUserinput')
    const categorySelect = document.getElementById('select-order')
    async function performSearch() {
        const query = searchUserInput.value.trim()
        const selectedCategory = categorySelect.value
        // 如果既没输入内容，又选择了 "全部"，就查询所有订单
        if (!query && selectedCategory === '全部') {
            checkOrderStatus(whologin)
            return
        }
        const requestBody = {
            searchUserinput: query,
            category: selectedCategory,
            name: whologin.name,
            email: whologin.Emailtext
        }
        const res = await fetchOrders('/searchorder', requestBody)
        renderOrders(res.data, whologin)
    }
    searchOrderButton.addEventListener('click', performSearch)
    searchUserInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            performSearch()
        }
    })
    categorySelect.addEventListener('change', performSearch)
}
//----------------------单独展示商品--------------------------------
//展示商品页面
function showoneProduct(whologin) {
    fetch('/showoneProduct', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            proID: whologin.ID,
            name: whologin.name,
            email: whologin.Emailtext
        })
    })
        .then(response => response.json())
        .then(res => {
            if (res.success) {
                const salesperson = document.querySelector('.product-message .product-nav span')
                const pname = document.querySelector('.product-message .product-left .product-right .Product-name')
                const simage = document.querySelector('.product-message .product-left .s-img')
                const bimage = document.querySelector('.product-message .product-left .b-img')
                const price = document.querySelector('.product-message .product-left .product-right .Product-price-number')
                const category = document.querySelector('.product-message .product-left .product-right .Product-category')
                const stock = document.querySelector('.product-message .product-left .product-right .Product-stock')
                salesperson.innerText = res.data.sname
                salesperson.setAttribute('id', `${res.data.salesperson_email}`)
                pname.innerText = res.data.pname
                pname.setAttribute('id', `${res.data.id}`)
                simage.src = res.data.image_url
                simage.alt = res.data.pname
                bimage.src = res.data.image_url
                bimage.alt = res.data.pname
                price.innerText = res.data.price
                category.innerText = res.data.category
                stock.innerHTML = `剩余${res.data.stock}件`
                if (res.data.status != '1') {
                    const buynow = getall.querySelector('.product-message .product-left .product-right .options .buy-now')
                    const addcart = getall.querySelector('.product-message .product-left .product-right .options .add-cart')
                    buynow.innerText = '商品已下架'
                    buynow.setAttribute('disabled', 'true')
                    addcart.innerText = '商品已下架'
                    addcart.setAttribute('disabled', 'true')
                }
                if (res.data.stock <= 0) {
                    const buynow = getall.querySelector('.product-message .product-left .product-right .options .buy-now')
                    buynow.innerText = '商品库存不足'
                    buynow.setAttribute('disabled', 'true')
                }
            }
            else {
                const buynow = document.querySelector('.product-message .product-left .product-right .options .buy-now')
                const addcart = document.querySelector('.product-message .product-left .product-right .options .add-cart')
                buynow.innerText = '商品已下架'
                buynow.setAttribute('disabled', 'true')
                addcart.innerText = '商品已下架'
                addcart.setAttribute('disabled', 'true')
            }
        })
}
//查看商品是否已在购物车
function searchThisIFincart(whologin) {
    const getall = document.querySelector('body')
    const addcart = getall.querySelector('.product-message .product-left .options .add-cart')
    fetch('/searchThisIFincart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: whologin.Emailtext,
            proID: whologin.ID,
        })
    })
        .then(response => response.json())
        .then(res => {
            if (res.success) {
                addcart.innerText = '商品已加入购物车'
                addcart.setAttribute('disabled', 'true');
            }
        })
}
//进去店铺按钮
function oneProductGoshop(whologin) {
    const Goshopbutton = document.querySelector('.product-message .product-nav .enter-shop')
    Goshopbutton.addEventListener('click', function () {
        const salesperson = document.querySelector('.product-message .product-nav span')
        const salespersonemail = salesperson.getAttribute('id')
        if (!salespersonemail) {
            const message = document.querySelector('#successOverlay p')
            message.innerText = `商家不存在`
            openModal('successOverlay')
            return
        }
        let User = {
            name: whologin.name,
            Emailtext: whologin.Emailtext,
            salespersonemail: salespersonemail
        }
        let Userpaycart = new URLSearchParams(User).toString()
        window.location.href = `http://localhost/userinshop.html?${Userpaycart}`
    })
}
//加入购物车按钮
function ADDcart(whologin) {
    const getall = document.querySelector('body')
    const addcart = getall.querySelector('.product-message .product-left .options .add-cart')
    addcart.addEventListener('click', function () {
        //显示加载遮罩层
        openModal("loadingOverlay")
        const pname = getall.querySelector('.product-message .product-left .product-right .Product-name')
        fetch('/ADDcart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: whologin.Emailtext,
                proID: whologin.ID,
                name: whologin.name
            })
        })
            .then(response => response.json())
            .then(res => {
                setTimeout(() => {
                    const message = getall.querySelector('#successOverlay p')
                    message.innerText = `${res.message}`
                    if (res.success) {
                        closeModal("loadingOverlay")
                        openModal("successOverlay")
                        addcart.innerText = '商品已加入购物车'
                        addcart.setAttribute('disabled', 'true');
                    }
                    else {
                        closeModal("loadingOverlay")
                        openModal("successOverlay")
                        if (res.status == 2) {
                            addcart.innerText = '商品已加入购物车!';
                            addcart.setAttribute('disabled', 'true')
                        }
                    }
                }, 1000)
            })
    })
}
//点击立即购买按钮
function ClickBUYproductNOW(whologin) {
    //点击立即购买 加载层运行，前往数据库获取用户余额，商品名，图片，单价
    //获取成功关闭加载层，显示购买层，更换对应信息
    //点击交易按钮，发送id，email，count到后端进行处理，获取用户余额 比对余额然后扣除并返回更新后的用户余额
    //修改本地用户余额的信息
    const getall = document.querySelector('body')
    const buynowbutton = getall.querySelector('.product-message .product-left .options .buy-now')
    buynowbutton.addEventListener('click', function () {
        openModal('loadingOverlay')
        fetch('/ClickBUYproductNOW', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: whologin.Emailtext,
                proID: whologin.ID,
            })
        })
            .then(response => response.json())
            .then(async res => {
                setTimeout(() => {
                    if (res.success) {
                        closeModal('loadingOverlay')
                        const image = getall.querySelector('.buy-box .product-message-buy img')
                        const pname = getall.querySelector('.buy-box .product-message-buy .product-name-price .name')
                        const price = getall.querySelector('.buy-box .product-message-buy .product-name-price .price .Product-price-number')
                        const stock = getall.querySelector('.buy-box .product-message-buy .product-name-price .stock')
                        const usermoney = getall.querySelector('.buy-box .countmoney .usermoney .Product-price-number')
                        const needmoney = getall.querySelector('.buy-box .countmoney .needmoney .Product-price-number')
                        const quantityInput = getall.querySelector('#buyingOverlay .countoptions .count')
                        image.src = res.data.image_url
                        image.alt = res.data.pname
                        price.innerText = res.data.price
                        stock.innerText = `库存：${res.data.stock}件`
                        pname.innerText = res.data.pname
                        usermoney.innerText = res.data.umoney
                        needmoney.innerText = res.data.price
                        quantityInput.value = '1'
                        openModal('buyingOverlay')
                    }
                    else {
                        const message = getall.querySelector('#successOverlay p')
                        message.innerText = `${res.message}`
                        finishLoading()
                    }
                }, 1000)

            })
    })
}
//交易弹窗增减按钮
function BuyModalADDandReduce() {
    const getall = document.querySelector('body')
    const addButton = getall.querySelector('#buyingOverlay .countoptions .addone')
    const reduceButton = getall.querySelector('#buyingOverlay .countoptions .reduceone')
    const quantityInput = getall.querySelector('#buyingOverlay .countoptions .count')
    const needmoney = getall.querySelector('#buyingOverlay .countmoney .needmoney .Product-price-number')
    const price = getall.querySelector('#buyingOverlay .product-name-price .price .Product-price-number')
    quantityInput.addEventListener('input', () => {
        updateButtons()
    })
    addButton.addEventListener('click', () => {
        let currentValue = parseInt(quantityInput.value, 10) ? (parseInt(quantityInput.value, 10) || 1) : 0
        currentValue = currentValue < 0 ? 0 : currentValue
        quantityInput.value = currentValue + 1
        updateButtons()
    })
    reduceButton.addEventListener('click', () => {
        let currentValue = parseInt(quantityInput.value, 10) ? (parseInt(quantityInput.value, 10) || 1) : 0
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1
        }
        updateButtons()
    })
    function updateButtons() {
        let currentValue = parseInt(quantityInput.value, 10) ? (parseInt(quantityInput.value, 10) || 1) : 0
        needmoney.innerText = parseFloat(currentValue) * parseFloat(price.innerText) > 0 ? (parseFloat(currentValue) * parseFloat(price.innerText)).toFixed(2) : 0
        currentValue <= 1 ? reduceButton.setAttribute('disabled', 'true') : reduceButton.removeAttribute('disabled')
    }
    updateButtons()
}
//交易弹窗发起交易按钮
function BuyModalClickBuyButton(whologin) {
    const getall = document.querySelector('body')
    const confirmbtn = getall.querySelector('#buyingOverlay .modal-buttons .confirm-btn')
    confirmbtn.addEventListener('click', function () {
        const getall = document.querySelector('body')
        const quantityInput = getall.querySelector('#buyingOverlay .countoptions .count')
        const pname = getall.querySelector('.product-message .product-left .product-right .Product-name')
        const bimage = getall.querySelector('.product-message .product-left .b-img')
        const price = getall.querySelector('.product-message .product-left .product-right .Product-price-number')
        const category = getall.querySelector('.product-message .product-left .product-right .Product-category')
        const stock = getall.querySelector('.product-message .product-left .product-right .Product-stock')
        const message = document.querySelector('#successOverlay p')
        if (quantityInput.value <= 0) {
            message.innerText = `请输入合理的商品数量`
            openModal('successOverlay')
            return
        }
        openModal('loadingOverlay')
        fetch('/BuyModalClickBuyButton', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: whologin.Emailtext,
                proID: whologin.ID,
                pname: pname.innerText,
                image_url: bimage.src,
                price: price.innerText,
                category: category.innerText,
                count: parseInt(quantityInput.value)
            })
        })
            .then(response => response.json())
            .then(res => {
                setTimeout(() => {
                    message.innerText = `${res.message}`
                    if (res.success) {
                        stock.innerText = `剩余${res.stock}件`
                        closeModal('buyingOverlay')

                    }
                    finishLoading()
                }, 1000)
            })
    })
}
//记录停留时长
function productstaytime(whologin) {
    let startTime = null
    let totaltime = 0
    function startTracking() {
        if (document.visibilityState === "visible") {
            startTime = Date.now();
        }
    }
    function stopTracking() {
        if (startTime) {
            totaltime += (Date.now() - startTime) / 1000
            startTime = null
        }
    }
    // 监听页面可见性变化
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            startTracking()
        } else {
            stopTracking()
        }
    })
    // 监听窗口关闭时的处理
    window.addEventListener("beforeunload", () => {
        stopTracking()
        try {
            fetch('/productstaytime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: whologin.Emailtext,
                    name: whologin.name,
                    proID: whologin.ID,
                    staytime: totaltime.toFixed(2)
                })
            })
        } catch (err) {
            err => console.error('数据发送失败:', err)
        }
    })
    // 页面加载时开始计时
    startTracking()
}

//----------------------购物车--------------------------------
//向后端请求购物车商品数据
async function fetchcart(url, requestBody) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })
        return await response.json()
    } catch (error) {
        console.error('获取订单失败:', error)
        return { success: false, data: [] }
    }
}
//前端渲染购物车商品数据
function rendercart(carts, whologin) {
    const cartBody = document.querySelector('.cart-message .cart-body');
    cartBody.innerHTML = ' '
    if (!carts || carts.length == 0) return
    const fragment = document.createDocumentFragment()
    const shopMap = new Map()
    carts.forEach(cart => {
        if (!shopMap.has(cart.salesperson_email)) {
            const shop = document.createElement('div')
            shop.classList.add('shop')
            shop.innerHTML = `
            <div class="shop-nav">
                <div class="select-saleperson-all">
                    <button class="select-saleperson-all-button"></button>
                    <span id="${cart.salesperson_email}">${cart.sname}</span>
                    <div class="enter-shop">进入店铺</div>
                </div>
            </div>`
            shopMap.set(cart.salesperson_email, shop)
        }
        const shop = shopMap.get(cart.salesperson_email);
        const Productbody = document.createElement('div')
        Productbody.classList.add('Product-body')
        Productbody.innerHTML = `
        <div class="select-one">
            <div class="select-one-button"></div>
        </div>
        <div class="Product-name-img">
            <img src="${cart.image_url}" alt="${cart.pname}" class="${cart.id}">
            <div div class="Product-name" > ${cart.pname}</div>
            <div class="Product-category">${cart.category}</div>
        </div>
        <div class="Product-price">
            <span class="Product-price-symbol">￥</span><span class="Product-price-number">${cart.price}</span>
        </div>
        <div class="Product-count">
            <input class="count" type="number" value="${cart.count}" min="1" max="${cart.stock ? cart.stock : 1}">
            库存：${cart.stock}件
        </div>
        <div class="Product-count-money">
            <span class="Product-countmoney-symbol">￥</span><span class="Product-countmoney-number">${parseFloat(cart.count * cart.price).toFixed(2)}</span>
        </div>
        <div class="option"><button title="删除">×</button></div>`
        shop.appendChild(Productbody)
    })
    shopMap.forEach(shop => fragment.appendChild(shop))
    cartBody.appendChild(fragment)
    cartgoproduct(whologin)
    deletecart(whologin)
    productcount(whologin)
    CartSelection()
    cartoneProductGoshop(whologin)
}
//购物车商品页面初始化
async function showUsercart(whologin) {
    const res = await fetchcart('/showUsercart', {
        name: whologin.name,
        email: whologin.Emailtext
    })
    rendercart(res.data, whologin)
}
// 删除购物车商品
function deletecart(whologin) {
    const deletebuttons = document.querySelectorAll('.cart-body .shop .Product-body .option button')
    deletebuttons.forEach(button => {
        button.addEventListener('click', async function () {
            const shop = button.closest('.shop')
            const Productbody = button.closest('.Product-body')
            const message = document.querySelector('#successOverlay p')
            openModal('loadingOverlay')
            const proID = Productbody.querySelector('.Product-name-img img').className
            try {
                const response = await fetch('/deletecart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: whologin.name,
                        email: whologin.Emailtext,
                        proID: proID
                    })
                })
                const res = await response.json()
                if (res.success) {
                    message.innerText = res.message;
                    setTimeout(() => {
                        shop.removeChild(Productbody)
                        finishLoading()
                    }, 1000)
                } else {
                    message.innerText = res.message
                    setTimeout(() => {
                        finishLoading()
                    }, 1000)
                }
            } catch (error) {
                console.error('删除订单失败:', error)
                message.innerText = '网络异常，请稍后再试'
                setTimeout(() => {
                    finishLoading()
                }, 1000)
            }
        })
    })
}
//点击图片跳转商品页面
function cartgoproduct(whologin) {
    const cartimg = document.querySelectorAll('.cart-body .shop .Product-body .Product-name-img img')
    cartimg.forEach(Element => {
        Element.addEventListener('click', function () {
            let proID = {
                name: whologin.name,
                ID: Element.className,
                Emailtext: whologin.Emailtext
            }
            let pro = new URLSearchParams(proID).toString()
            window.open(`http://localhost/productshow.html?${pro}`, '_blank');
        })
    })
}
//搜索购物车商品
function searchcart(whologin) {
    const searchProductbutton = document.querySelector('.nav .searchProduct .searchProductbutton')
    const searchUserInput = document.querySelector('.nav .searchProduct .searchUserinput')
    const categorySelect = document.getElementById('selectProduct')
    async function performSearch() {
        const query = searchUserInput.value.trim()
        const selectedCategory = categorySelect.value
        // 如果既没输入内容，又选择了 "全部"，就查询所有购物车商品
        if (!query && selectedCategory === '全部') {
            showUsercart(whologin)
            return
        }
        const requestBody = {
            searchUserinput: query,
            category: selectedCategory,
            name: whologin.name,
            email: whologin.Emailtext
        }
        const res = await fetchOrders('/searchcart', requestBody)
        rendercart(res.data, whologin)
    }
    searchProductbutton.addEventListener('click', performSearch)
    searchUserInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            performSearch()
        }
    })
    categorySelect.addEventListener('change', performSearch)
}
// 购物车商品数量更改
function productcount(whologin) {
    document.querySelectorAll('.Product-count .count').forEach(quantityInput => {
        let debounceTimer
        quantityInput.addEventListener('input', () => {
            clearTimeout(debounceTimer) // 清除上一次的定时器
            let currentValue = Math.max(1, parseInt(quantityInput.value, 10) || 1)
            const Productbody = quantityInput.closest('.Product-body')
            if (!Productbody) return
            const countmoney = Productbody.querySelector('.Product-count-money .Product-countmoney-number')
            const priceElement = Productbody.querySelector('.Product-price .Product-price-number')
            const productId = Productbody.querySelector('.Product-name-img img').className
            if (!countmoney || !priceElement) return
            const price = parseFloat(priceElement.innerText) || 0
            countmoney.innerText = (currentValue * price).toFixed(2)
            debounceTimer = setTimeout(() => {
                updateCart(productId, currentValue, whologin)
            }, 1000)
            checkoutBar()
        })
    })
}
// 发送数据到后端更新购物车
async function updateCart(productId, count, whologin) {
    try {
        const response = await fetch('/updateCart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: whologin.name,
                email: whologin.Emailtext,
                proID: productId,
                count
            })
        })
        const res = await response.json()
        if (!res.success) {
            const message = document.querySelector('#successOverlay p')
            message.innerText = `${res.message}`
            openModal('successOverlay')
        }
    } catch (error) {
        console.error('[更新购物车] 发生错误:', error)
    }
}
//结算栏的数字变换
function checkoutBar() {
    const selectedAmountEl = document.querySelector('.checkout-bar .amount .selected-amount')
    const selectedCountEl = document.querySelector('.checkout-bar .all-conut .selected-count')
    let totalAmount = 0
    let totalQuantity = 0
    document.querySelectorAll('.select-one-button.selected').forEach(button => {
        const productBody = button.closest('.Product-body')
        const countmoneyEl = productBody.querySelector('.Product-count-money .Product-countmoney-number')
        const quantityEl = productBody.querySelector('.Product-count .count')
        const countmoney = parseFloat(countmoneyEl?.innerText) || 0
        const quantity = Math.max(1, parseInt(quantityEl?.value, 10) || 1)
        totalAmount += countmoney
        totalQuantity += quantity
    })
    selectedAmountEl.innerText = `￥${totalAmount.toFixed(2)}`
    selectedCountEl.innerText = totalQuantity
}
//选择框
function CartSelection() {
    // 获取所有的选择框
    const selectAllButton = document.querySelector('.select-all-button')
    const shopSelectButtons = document.querySelectorAll('.select-saleperson-all-button')
    const productSelectButtons = document.querySelectorAll('.select-one-button')
    // 全选框点击事件
    selectAllButton.addEventListener('click', () => {
        //是否包含该类名，，没有会在下一个函数添加
        const isSelected = selectAllButton.classList.contains('selected')
        //传入所有的单选和店铺全选
        toggleSelection(selectAllButton, productSelectButtons, shopSelectButtons, isSelected)
        checkoutBar()
    })
    // 店铺全选框点击事件
    shopSelectButtons.forEach(shopSelect => {
        shopSelect.addEventListener('click', () => {
            const shopProducts = shopSelect.closest('.shop').querySelectorAll('.select-one-button')
            const isSelected = shopSelect.classList.contains('selected')
            //传入该店铺内的所有单选
            toggleSelection(shopSelect, shopProducts, [], isSelected)
            // 同时检查店铺全选框和全选框状态
            checkAllSelection()
            checkoutBar()
        })
    })
    // 商品单选框点击事件
    productSelectButtons.forEach(productSelect => {
        productSelect.addEventListener('click', () => {
            const shopSelect = productSelect.closest('.shop').querySelector('.select-saleperson-all-button')
            const isSelected = productSelect.classList.contains('selected')
            //只传入当前单选
            toggleSelection(productSelect, [], [], isSelected)
            // 同时检查店铺全选框和全选框状态
            checkShopSelection(productSelect.closest('.shop'), shopSelect)
            checkAllSelection()
            checkoutBar()
        })
    })
}
//切换选中状态和背景图片
function toggleSelection(selectButton, relatedSelectButtons = [], relatedShopSelectButtons = [], isSelected) {
    //类名没有selected的话isSelected为false，则就要加上类名selected
    if (isSelected) {
        selectButton.classList.remove('selected')
        selectButton.style.backgroundImage = 'hidden'
    } else {
        selectButton.classList.add('selected')
    }
    // 如果有相关的商品或店铺按钮，也一并处理
    relatedSelectButtons.forEach(button => {
        if (isSelected) {
            button.classList.remove('selected')
            button.style.backgroundImage = 'hidden'
        } else {
            button.classList.add('selected')
        }
    })
    relatedShopSelectButtons.forEach(button => {
        if (isSelected) {
            button.classList.remove('selected')
            button.style.backgroundImage = 'hidden'
        } else {
            button.classList.add('selected')
        }
    })
}
//检查店铺内商品选择框是否全部选中，更新店铺全选框状态
function checkShopSelection(shopElement, shopSelectButton) {
    const productSelectButtons = shopElement.querySelectorAll('.select-one-button')
    const allSelected = Array.from(productSelectButtons).every(button => button.classList.contains('selected'))
    //如果店铺所有单选都被选上，则店铺全选要选上
    if (allSelected) {
        shopSelectButton.classList.add('selected')
    } else {
        shopSelectButton.classList.remove('selected')
        shopSelectButton.style.backgroundImage = 'hidden'
    }
}
//检查全选框的状态（是否所有商品和店铺都选中）
function checkAllSelection() {
    const selectAllButton = document.querySelector('.select-all-button')
    const shopSelectButtons = document.querySelectorAll('.select-saleperson-all-button')
    const productSelectButtons = document.querySelectorAll('.select-one-button')
    // 检查所有商品和店铺是否都被选中
    const allSelected = Array.from(shopSelectButtons).every(shopSelect => shopSelect.classList.contains('selected')) &&
        Array.from(productSelectButtons).every(productSelect => productSelect.classList.contains('selected'))
    //如果所有单选都被选上，则全选要选上
    if (allSelected) {
        selectAllButton.classList.add('selected')
    } else {
        selectAllButton.classList.remove('selected')
        selectAllButton.style.backgroundImage = 'hidden'
    }
}
//购买商品
async function checkoutproduct(whologin) {
    document.querySelector('.checkout-bar .checkout-button').addEventListener('click', async function () {
        const message = document.querySelector('#successOverlay p')
        const selectedButtons = document.querySelectorAll('.select-one-button.selected')
        if (selectedButtons.length === 0) {
            message.innerText = '请选择商品'
            openModal('successOverlay')
            return
        }
        const selectedProducts = []
        selectedButtons.forEach(button => {
            const productBody = button.closest('.Product-body')
            const pname = productBody.querySelector('.Product-name-img .Product-name').innerText.trim()
            const category = productBody.querySelector('.Product-name-img .Product-category').innerText.trim()
            const price = parseFloat(productBody.querySelector('.Product-price .Product-price-number').innerText.trim())
            const proID = productBody.querySelector('.Product-name-img img').className
            const image_url = productBody.querySelector('.Product-name-img img').src
            const count = parseInt(productBody.querySelector('.Product-count .count')?.value || '1', 10)
            selectedProducts.push({ pname, category, price, proID, count, image_url })
        })
        openModal('loadingOverlay')
        try {
            const response = await fetch('/checkoutproduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: whologin.name,
                    email: whologin.Emailtext,
                    selectedProducts
                })
            })
            const res = await response.json()
            setTimeout(async () => {
                message.innerText = `${res.message}`
                if (res.success) {
                    //重新展示购物车
                    await showUsercart(whologin)
                }
                finishLoading()
            }, 1000)
        } catch (error) {
            console.error('发生错误:', error)
        }
    })
}
//进去店铺按钮
function cartoneProductGoshop(whologin) {
    const Goshopbutton = document.querySelectorAll('.shop .shop-nav .enter-shop')
    Goshopbutton.forEach(button => {
        button.addEventListener('click', function () {
            const selectsalepersonall = button.closest('.select-saleperson-all')
            const salesperson = selectsalepersonall.querySelector('span')
            const salespersonemail = salesperson.getAttribute('id')
            if (!salespersonemail) {
                const message = document.querySelector('#successOverlay p')
                message.innerText = `商家不存在`
                openModal('successOverlay')
                return
            }
            let User = {
                name: whologin.name,
                Emailtext: whologin.Emailtext,
                salespersonemail: salespersonemail
            }
            let Userpaycart = new URLSearchParams(User).toString()
            window.location.href = `http://localhost/userinshop.html?${Userpaycart}`
        })
    })

}
//----------------------从url读取信息--------------------------------
//主页从url读取用户信息 不做身份验证登录
function indexgetUser() {
    let urlParams = new URLSearchParams(window.location.search)
    let whologin = {
        who: urlParams.get('who') ? urlParams.get('who') : 'nobody',
        name: urlParams.get('name'),
        Emailtext: urlParams.get('Emailtext')
    }
    return whologin
}
//主页从url读取用户信息 不做身份验证登录
function userinshopgetUser() {
    let urlParams = new URLSearchParams(window.location.search)
    let whologin = {
        name: urlParams.get('name'),
        Emailtext: urlParams.get('Emailtext'),
        salespersonemail: urlParams.get('salespersonemail')
    }
    return whologin
}
//单个商品页面从url读取用户信息
function oneProductshowgetProID() {
    let urlParams = new URLSearchParams(window.location.search)
    let whologin = {
        name: urlParams.get('name'),
        ID: urlParams.get('ID'),
        Emailtext: urlParams.get('Emailtext'),
    }
    return whologin
}
//订单页面从url读取用户信息
function ordergetUser() {
    let urlParams = new URLSearchParams(window.location.search)
    let whologin = {
        name: urlParams.get('name'),
        Emailtext: urlParams.get('Emailtext'),
    }
    return whologin
}
//购物车页面从url读取用户信息
function cartgetUser() {
    let urlParams = new URLSearchParams(window.location.search)
    let whologin = {
        name: urlParams.get('name'),
        Emailtext: urlParams.get('Emailtext'),
    }
    return whologin
}
//----------------------展示对应的导航栏/去往其他页面操作------------------------
//未登录时的导航栏
function nobodynav() {
    const nav = document.querySelector('.nav')
    const navlogin = document.createElement('a');
    navlogin.classList.add('login')
    navlogin.href = 'userlogin.html';
    navlogin.innerHTML = '登录'
    const navregister = document.createElement('a');
    navregister.classList.add('signup')
    navregister.href = 'userregister.html';
    navregister.innerHTML = '注册'
    nav.appendChild(navlogin)
    nav.appendChild(navregister)
}
//用户导航栏
function usernav(whologin) {
    const nav = document.querySelector('.nav')
    const navUserName = document.createElement('span');
    navUserName.classList.add('username')
    navUserName.innerHTML = '用户：' + whologin.name
    const navUserMoney = document.createElement('span')
    navUserMoney.classList.add('usermoney')
    const navpaycar = document.createElement('button');
    navpaycar.classList.add('cart')
    navpaycar.innerHTML = '购物车'
    const navorder = document.createElement('button')
    navorder.classList.add('order')
    navorder.innerHTML = '历史订单'
    const navlogout = document.createElement('button')
    const searchProduct = document.createElement('div')
    searchProduct.classList.add('searchProduct')
    searchProduct.innerHTML = ` <button class="searchProductbutton">点击搜索</button>
            <input type="text" class="searchUserinput" placeholder="输入商品名称">
            <label for="selectProduct">商品类别:</label>
            <select id="selectProduct" name="category">
                <option value="全部">全部</option>
                <option value="数码产品">数码产品</option>
                <option value="服装">服装</option>
                <option value="生活用品">生活用品</option>
                <option value="食品">食品</option>
            </select>`
    navlogout.classList.add('logout')
    navlogout.innerHTML = '退出登录'
    fetch('/usernav', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            Email: whologin.Emailtext
        })
    })
        .then(response => response.json())
        .then(res => {
            if (res.success) {
                navUserMoney.innerHTML = '余额：' + res.data.umoney
            }
        })
    nav.appendChild(navUserName)
    nav.appendChild(navUserMoney)
    nav.appendChild(navpaycar)
    nav.appendChild(navorder)
    nav.appendChild(searchProduct)
    nav.appendChild(navlogout)
}
//商家导航栏
function Snav(whologin) {
    const nav = document.querySelector('.nav')
    const navUserName = document.createElement('span');
    navUserName.classList.add('username')
    navUserName.innerHTML = '商家：' + whologin.name
    const navorder = document.createElement('button')
    navorder.onclick = () => document.getElementById('orders')?.scrollIntoView({ behavior: 'smooth' })
    navorder.classList.add('checkorder')
    navorder.innerHTML = '查看订单'
    const navproduct = document.createElement('button')
    navproduct.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' })
    navproduct.classList.add('checkproduct')
    navproduct.innerHTML = '查看商品'
    const navsaleChart = document.createElement('button')
    navsaleChart.onclick = () => document.getElementById('saleChart')?.scrollIntoView({ behavior: 'smooth' })
    navsaleChart.classList.add('checksaleChart')
    navsaleChart.innerHTML = '查看销售图'
    const navadd = document.createElement('button')
    navadd.classList.add('addproduct')
    navadd.innerHTML = '添加商品'
    const searchProduct = document.createElement('div')
    searchProduct.classList.add('searchProduct')
    searchProduct.innerHTML = ` <button class="searchProductbutton">点击搜索</button>
            <input type="text" class="searchUserinput" placeholder="输入商品名称">
            <label for="selectProduct">商品类别:</label>
            <select id="selectProduct" name="category">
                <option value="全部">全部</option>
                <option value="数码产品">数码产品</option>
                <option value="服装">服装</option>
                <option value="生活用品">生活用品</option>
                <option value="食品">食品</option>
            </select>`
    const navlogout = document.createElement('button')
    navlogout.classList.add('logout')
    navlogout.innerHTML = '退出登录'
    nav.appendChild(navUserName)
    nav.appendChild(navproduct)
    nav.appendChild(navsaleChart)
    nav.appendChild(navorder)
    nav.appendChild(navadd)
    nav.appendChild(searchProduct)
    nav.appendChild(navlogout)

}
function Mnav(whologin) {
    const nav = document.querySelector('.nav')
    const navUserName = document.createElement('span');
    navUserName.classList.add('username')
    navUserName.innerHTML = '管理员：' + whologin.name
    const navadd = document.createElement('button')
    navadd.onclick = () => document.getElementById('checkshop')?.scrollIntoView({ behavior: 'smooth' })
    navadd.classList.add('checkshop')
    navadd.innerHTML = '商家管理'
    const navproductreview = document.createElement('button')
    navproductreview.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' })
    navproductreview.classList.add('productreview')
    navproductreview.innerHTML = '商品审核'
    const navsaleChart = document.createElement('button')
    navsaleChart.onclick = () => document.getElementById('saleChart')?.scrollIntoView({ behavior: 'smooth' })
    navsaleChart.classList.add('checksaleChart')
    navsaleChart.innerHTML = '查看销售图'
    const navlogout = document.createElement('button')
    navlogout.classList.add('logout')
    navlogout.innerHTML = '退出登录'
    nav.appendChild(navUserName)
    nav.appendChild(navadd)
    nav.appendChild(navproductreview)
    nav.appendChild(navsaleChart)
    nav.appendChild(navlogout)
}
//用户点击购物车链接
function Gocart(whologin) {
    const cart = document.querySelector('.cart')
    cart.addEventListener('click', function () {
        let User = {
            name: whologin.name,
            Emailtext: whologin.Emailtext,
        }
        let Userpaycart = new URLSearchParams(User).toString()
        window.open(`http://localhost/cart.html?${Userpaycart}`, '_blank');
    })
}
//用户点击返回主页
function GoIndex(whologin) {
    const getbacktoindexbutton = document.querySelector('.gobackindex')
    getbacktoindexbutton.addEventListener('click', function () {
        if (whologin.Emailtext == 'null') {
            window.location.href = `http://localhost/`
            return
        }
        let User = {
            who: 'user',
            name: whologin.name,
            Emailtext: whologin.Emailtext,
        }
        let Userpaycart = new URLSearchParams(User).toString()
        window.location.href = `http://localhost/?${Userpaycart}`
    })
}
//主页用户点击去历史订单页面
function Goorder(whologin) {
    const getpayartbutton = document.querySelector('.order')
    getpayartbutton.addEventListener('click', function () {
        let User = {
            name: whologin.name,
            Emailtext: whologin.Emailtext,
        }
        let Userpaycart = new URLSearchParams(User).toString()
        window.open(`http://localhost/order.html?${Userpaycart}`, '_blank');
    })
}
//点击单个商品去往单独商品页面
function GOoneProductshow(whologin) {
    const getall = document.querySelector('body')
    const products = getall.querySelectorAll('.product')
    products.forEach(Element => {
        Element.addEventListener('click', function () {
            const productID = Element.getAttribute('id')
            let proID = {
                name: whologin.name,
                ID: productID,
                Emailtext: whologin.Emailtext
            }
            let pro = new URLSearchParams(proID).toString()
            window.open(`http://localhost/productshow.html?${pro}`, '_blank')
        })
    })
}
//---------------当未登录时让所有的按钮都提示登录----------
function banbutton() {
    const getall = document.querySelectorAll('button');
    getall.forEach(button => {
        if (button.className !== 'gobackindex' && button.className !== 'confirm-btn') {
            button.addEventListener('click', function (event) {
                const message = document.querySelector('#successOverlay p')
                message.innerText = `请先登录`
                openModal('successOverlay')
            })
        }
    })
    document.querySelector('.enter-shop').addEventListener('click', function () {
        const message = document.querySelector('#successOverlay p')
        message.innerText = `请先登录`
        openModal('successOverlay')
    })
}

let SchartA, SchartB, SchartC;
//获取销售数据
async function shopSalesDataChart(whologin) {
    const requestBody = {
        email: whologin.Emailtext,
        name: whologin.name,
    }
    const data = await fetchOrders('/shopSalesData', requestBody)
    shoprenderCharts(data)
    // 监听窗口大小变化，重新渲染图表
    window.addEventListener('resize', () => shoprenderCharts(data))
}
//渲染图表
function shoprenderCharts(data) {
    const categoryChart = document.querySelector('.categoryChart')
    const sevendayChart = document.querySelector('.sevendayChart')
    const productChart = document.querySelector('.productChart')
    const dpr = window.devicePixelRatio < 1.25 ? 1.25 : window.devicePixelRatio
    categoryChart.width = categoryChart.offsetWidth * dpr
    categoryChart.height = categoryChart.offsetHeight * dpr
    sevendayChart.width = sevendayChart.offsetWidth * dpr
    sevendayChart.height = sevendayChart.offsetHeight * dpr
    productChart.width = productChart.offsetWidth * dpr
    productChart.height = productChart.offsetHeight * dpr
    // 获取上下文
    const categoryChartCtx = categoryChart.getContext('2d')
    const sevendayChartCtx = sevendayChart.getContext('2d')
    const productChartCtx = productChart.getContext('2d')
    // 如果已经有图表实例，销毁它
    if (SchartA) {
        SchartA.destroy()
    }
    if (SchartB) {
        SchartB.destroy()
    }
    if (SchartC) {
        SchartC.destroy()
    }
    //各个商品类别销售图
    SchartA = new Chart(categoryChartCtx, {
        type: 'bar',
        data: {
            labels: data.categories.categories, // x轴的类别
            datasets: [
                {
                    label: '销售量', // 左侧 Y 轴
                    data: data.categories.totalCounts, // 销售量数据
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    yAxisID: 'y-axis-left' // 绑定到左侧 Y 轴
                },
                {
                    label: '销售总额', // 右侧 Y 轴
                    data: data.categories.totalSales, // 销售总额数据
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    yAxisID: 'y-axis-right' // 绑定到右侧 Y 轴
                }
            ]

        },
        options: {
            // responsive: false,
            plugins: {
                datalabels: {
                    anchor: 'start',  // 数据标签的位置（末端）
                    align: 'top',   // 数据标签对齐方式（上方）
                    font: {
                        size: 18      // 标签字体大小
                    },
                    color: 'black',  // 标签字体颜色
                    offset: 0,  // 调整数据标签与柱子的间距，避免重叠
                    formatter: (value) => value // 显示数据值
                },
                legend: {
                    position: 'top',  // 将图例移到顶部
                    labels: {
                        font: { size: 22 }
                    },
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 18
                        }
                    }
                },
                'y-axis-left': {
                    position: 'left',
                    ticks: {
                        beginAtZero: true,
                        font: {
                            size: 18
                        }
                    }
                },
                'y-axis-right': {
                    position: 'right',
                    ticks: {
                        beginAtZero: true,
                        font: {
                            size: 18
                        }
                    }
                }
            },

        }
    })

    //30天内销售图
    SchartB = new Chart(sevendayChartCtx, {
        type: 'line',
        data: {
            labels: data.sevenday.dates,
            datasets: [
                {
                    label: '销售量趋势',
                    data: data.sevenday.totalCounts,
                    borderColor: 'blue',
                    fill: false,
                    yAxisID: 'y-axis-left',
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        font: {
                            size: 18
                        },

                        color: 'black',
                        formatter: (value) => value
                    }
                },
                {
                    label: '销售总额趋势',
                    data: data.sevenday.totalSales,
                    borderColor: 'rgba(255, 159, 64, 0.6)',
                    fill: false,
                    yAxisID: 'y-axis-right',
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        font: {
                            size: 18
                        },

                        color: 'black',
                        formatter: (value) => value
                    }
                }
            ]
        },
        options: {
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 18
                        },
                        padding: 30
                    },
                    offset: true
                },
                'y-axis-left': {
                    position: 'left',
                    ticks: {
                        font: {
                            size: 18
                        }
                    }
                },
                'y-axis-right': {
                    position: 'right',
                    ticks: {
                        font: {
                            size: 18
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 18
                        }
                    }, offset: true
                },
                tooltip: {
                    titleFont: {
                        size: 18
                    },
                    bodyFont: {
                        size: 18
                    }
                }
            }
        }
    })
    //各个商品类别销售图
    SchartC = new Chart(productChartCtx, {
        type: 'bar',
        data: {
            labels: data.product.id, // x轴的类别
            datasets: [
                {
                    label: '销售量', // 左侧 Y 轴
                    data: data.product.totalCounts, // 销售量数据
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    yAxisID: 'y-axis-left' // 绑定到左侧 Y 轴
                }
            ]
        },
        options: {
            plugins: {
                datalabels: {
                    anchor: 'start',  // 数据标签的位置（末端）
                    align: 'top',   // 数据标签对齐方式（上方）
                    font: {
                        size: 18      // 标签字体大小
                    },
                    color: 'black',  // 标签字体颜色
                    offset: 0,  // 调整数据标签与柱子的间距，避免重叠
                    formatter: (value) => value // 显示数据值
                },
                legend: {
                    position: 'top',  // 将图例移到顶部
                    labels: {
                        font: { size: 22 }
                    },
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 18
                        }
                    }
                },
                'y-axis-left': {
                    position: 'left',
                    ticks: {
                        beginAtZero: true,
                        font: {
                            size: 18
                        }
                    }
                }
            }
        }
    })
}
let MChartA, MChartB, MChartC;
//获取销售数据
async function managerSalesDataChart(whologin) {
    const requestBody = {
        email: whologin.Emailtext,
        name: whologin.name,
    }
    const data = await fetchOrders('/managerSalesData', requestBody)
    managerrenderCharts(data)
    // 监听窗口大小变化，重新渲染图表
    window.addEventListener('resize', () => managerrenderCharts(data))
}
//渲染图表
function managerrenderCharts(data) {
    const categoryChart = document.querySelector('.categoryChart')
    const sevendayChart = document.querySelector('.sevendayChart')
    const productChart = document.querySelector('.productChart')
    const dpr = window.devicePixelRatio < 1.25 ? 1.25 : window.devicePixelRatio
    categoryChart.width = categoryChart.offsetWidth * dpr
    categoryChart.height = categoryChart.offsetHeight * dpr
    sevendayChart.width = sevendayChart.offsetWidth * dpr
    sevendayChart.height = sevendayChart.offsetHeight * dpr
    productChart.width = productChart.offsetWidth * dpr
    productChart.height = productChart.offsetHeight * dpr
    // 获取上下文
    const categoryChartCtx = categoryChart.getContext('2d')
    const sevendayChartCtx = sevendayChart.getContext('2d')
    const productChartCtx = productChart.getContext('2d')
    // 如果已经有图表实例，销毁它
    if (MChartA) {
        MChartA.destroy()
    }
    if (MChartB) {
        MChartB.destroy()
    }
    if (MChartC) {
        MChartC.destroy()
    }
    //销售人员图
    MChartA = new Chart(categoryChartCtx, {
        type: 'bar',
        data: {
            labels: data.shop.email, // x轴的类别
            datasets: [
                {
                    label: '销售量', // 左侧 Y 轴
                    data: data.shop.totalCounts, // 销售量数据
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    yAxisID: 'y-axis-left' // 绑定到左侧 Y 轴
                },
                {
                    label: '销售总额', // 右侧 Y 轴
                    data: data.shop.totalSales, // 销售总额数据
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    yAxisID: 'y-axis-right' // 绑定到右侧 Y 轴
                }
            ]

        },
        options: {
            // responsive: false,
            plugins: {
                datalabels: {
                    anchor: 'start',  // 数据标签的位置（末端）
                    align: 'top',   // 数据标签对齐方式（上方）
                    font: {
                        size: 18      // 标签字体大小
                    },
                    color: 'black',  // 标签字体颜色
                    offset: 0,  // 调整数据标签与柱子的间距，避免重叠
                    formatter: (value) => value // 显示数据值
                },
                legend: {
                    position: 'top',  // 将图例移到顶部
                    labels: {
                        font: { size: 22 }
                    },
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 18
                        }
                    }
                },
                'y-axis-left': {
                    position: 'left',
                    ticks: {
                        beginAtZero: true,
                        font: {
                            size: 18
                        }
                    }
                },
                'y-axis-right': {
                    position: 'right',
                    ticks: {
                        beginAtZero: true,
                        font: {
                            size: 18
                        }
                    }
                }
            },

        }
    })
    let hueOffset = 0  // 用于增加色相的偏移量，确保每次生成的颜色差异较大
    function getRandomColor() {
        hueOffset = (hueOffset + 30) % 360;  // 每次增加 30，保证色相差异
        return `hsl(${hueOffset}, 70%, 50%)`;  // 使用固定的饱和度和亮度
    }
    // 生成折线图数据集
    //Object.keys(data.sevenday).map(category=>{} 让data.sevenday的每一项都执行下面的函数
    const MChartBdatasets = Object.keys(data.sevenday).map(category => {
        const categoryData = data.sevenday[category];
        return {
            label: category,
            data: categoryData.totalCounts,
            borderColor: getRandomColor(),
            backgroundColor: "transparent",
            tension: 0.3
        }
    })
    const MChartCdatasets = Object.keys(data.sevenday).map(category => {
        const categoryData = data.sevenday[category];
        return {
            label: category,
            data: categoryData.totalSales,
            borderColor: getRandomColor(),
            backgroundColor: "transparent",
            tension: 0.3
        }
    })
    //30天内销售图
    MChartB = new Chart(sevendayChartCtx, {
        type: "line",
        data: {
            labels: data.sortedDates,
            datasets: MChartBdatasets
        },
        options: {
            plugins: {
                datalabels: {
                    anchor: 'start',  // 数据标签的位置（末端）
                    align: 'top',   // 数据标签对齐方式（上方）
                    font: { size: 18 },     // 标签字体大小
                    color: 'black',  // 标签字体颜色
                    offset: 0,  // 调整数据标签与柱子的间距，避免重叠
                    formatter: (value) => value // 显示数据值
                },
                legend: {
                    position: 'top',  // 将图例移到顶部
                    labels: { font: { size: 22 } },
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 18
                        }
                    }
                },
                y: {
                    position: 'left',
                    ticks: {
                        beginAtZero: true,
                        font: {
                            size: 18
                        }
                    }
                }
            },

        }
    })
    //30天内销售图
    MChartC = new Chart(productChartCtx, {
        type: "line",
        data: {
            labels: data.sortedDates,
            datasets: MChartCdatasets
        },
        options: {
            plugins: {
                datalabels: {
                    anchor: 'start',  // 数据标签的位置（末端）
                    align: 'top',   // 数据标签对齐方式（上方）
                    font: { size: 18 },     // 标签字体大小
                    color: 'black',  // 标签字体颜色
                    offset: 0,  // 调整数据标签与柱子的间距，避免重叠
                    formatter: (value) => value // 显示数据值
                },
                legend: {
                    position: 'top',  // 将图例移到顶部
                    labels: { font: { size: 22 } },
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 18
                        }
                    }
                },
                y: {
                    position: 'left',
                    ticks: {
                        beginAtZero: true,
                        font: {
                            size: 18
                        }
                    }
                }
            },

        }
    })
    //各个商品类别销售图
    //各个商品类别销售图

}
//----------------主页所有功能-----------------------------
function indexfunction() {
    const whologin = indexgetUser()
    openModal('loadingOverlay')
    showProduct(0, 40, 1, whologin).then(() => {
        closeModal('loadingOverlay')
        if (whologin.who == 'nobody') {
            //未登录导航栏
            nobodynav()
        }
        if (whologin.who == 'user') {
            //用户导航栏
            usernav(whologin)
            logout(whologin)
            //用户点击购物车页面
            Gocart(whologin)
            //用户点击历史订单页面
            Goorder(whologin)
            //搜索主页商品
            searchindexProduct(whologin)
        }
    })
}
//----------------商品页面所有功能-----------------------------
function oneProductshowfunction() {
    //此处的whologin只有商品ID和用户邮箱和用户名
    let whologin = oneProductshowgetProID()
    //点击返回首页按钮
    GoIndex(whologin)
    //展示当前商品
    showoneProduct(whologin)
    if (whologin.Emailtext == 'null') {
        banbutton()
    }
    else {
        productstaytime(whologin)
        //查询该商品是否在购物车
        searchThisIFincart(whologin)
        //点击购物车按钮
        Gocart(whologin)
        //点击历史订单按钮
        Goorder(whologin)
        //进入店铺
        oneProductGoshop(whologin)
        //加入购物车
        ADDcart(whologin)
        //立即购买
        ClickBUYproductNOW(whologin)
        //购买弹窗加减按钮
        BuyModalADDandReduce()
        //购买弹窗发起交易按钮
        BuyModalClickBuyButton(whologin)
    }
}
//----------------历史订单页面所有功能-----------------------------
function orderfunction() {
    let whologin = ordergetUser()
    //点击购物车按钮
    Gocart(whologin)
    //点击返回首页按钮
    GoIndex(whologin)
    //展示用户历史订单
    showUserorder(whologin)
    //查看不同状态的订单
    setupOrderEventListeners(whologin)
    //搜索订单
    searchorder(whologin)
}
//----------------购物车页面所有功能-----------------------------
function cartfunction() {
    //不允许在5秒内重复刷新
    // banrefresh()
    let whologin = cartgetUser()
    //点击历史订单按钮
    Goorder(whologin)
    //点击返回首页按钮
    GoIndex(whologin)
    //显示个人购物车
    showUsercart(whologin)
    //搜索购物车商品
    searchcart(whologin)
    //购买商品
    checkoutproduct(whologin)
}
//----------------商家页面所有功能-----------------------------
function shopindex() {
    Chart.register(ChartDataLabels)
    const whologin = indexgetUser()
    Snav(whologin)
    logout(whologin)
    //展示商家商品
    showProduct(0, 40, 1, whologin)
    shopSalesDataChart(whologin)
    //搜索商家商品
    searchindexProduct(whologin)
    //展示商家订单
    showShoporder(whologin)
    //查看不同状态的订单
    setupShopOrder(whologin)
    //查询订单
    searchshoporder(whologin)
    //添加商品
    addproduct(whologin)
    // 所负责销售商品的目录管理（商品类别的添加和删除）；1
    // 所负责销售商品类别信息的修改（销售价格，在库数目）；1
    // 所负责销售商品类别的销售状态信息的监控；？
    // 用户购买其所负责销售商品的浏览/购买的日志记录；1 没插入数据库还
}
function userinshop() {
    const whologin = userinshopgetUser()
    userinshopshowProduct(0, 40, 1, whologin)
    searchuserinshopindexProduct(whologin)
    GoIndex(whologin)
    Gocart(whologin)
    //用户点击历史订单页面
    Goorder(whologin)
}
//----------------管理员页面所有功能-----------------------------
function managerindex() {
    Chart.register(ChartDataLabels)
    const whologin = indexgetUser()
    Mnav(whologin)
    logout(whologin)
    managershowProduct(0, 40, 1, whologin)
    managerSalesDataChart(whologin)
    managershowshop(whologin)
    //搜索商家
    searchshopaccount(whologin)
    //选择不同状态的商家
    // setupShopEventListeners(whologin)
    //添加商家
    addshop(whologin)
    // 对销售人员ID的管理（销售人员的ID添加，删除）；
    // 对销售人员ID的登录口令的重置；
    // 对销售人员负责商品类别的销售业绩的查询和监控；销售人员销售图柱状图
    // 各个商品类别的销售统计报表，销售状态，库存管理；
    // 各个商品类别的销售业绩的查询和统计；日期商品类别折线图
}
