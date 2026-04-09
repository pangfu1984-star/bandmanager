# BandManager GitHub Pages 部署指南

## 部署步骤

### 1. 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 仓库名称填写 `bandmanager`（或你喜欢的名字）
3. 选择 **Public**（公开）
4. 点击 **Create repository**

### 2. 上传代码到 GitHub

在本地项目文件夹中执行：

```bash
# 初始化 git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 关联远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/bandmanager.git

# 推送代码
git push -u origin main
```

### 3. 开启 GitHub Pages

1. 打开仓库页面
2. 点击 **Settings** → 左侧 **Pages**
3. **Source** 选择 **GitHub Actions**
4. 等待自动部署完成

### 4. 访问网站

部署完成后，访问地址：
```
https://YOUR_USERNAME.github.io/bandmanager
```

---

## 成员如何使用

把上面的网址发给乐队成员，他们直接在浏览器中打开即可使用。

**注意：** 由于是纯前端应用，每个成员的数据是独立的。如需共享数据，请使用「数据备份」功能导出 ZIP 文件互相传递。

---

## 更新网站

修改代码后，重新推送即可自动部署：

```bash
git add .
git commit -m "更新内容"
git push
```

GitHub Actions 会自动构建并部署新版本。
