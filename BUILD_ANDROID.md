# 安卓 APK 打包流程

本文档把「今天吃什么」打包成安卓 APK 并安装到手机上的完整流程讲清楚，照着做即可。适用于 macOS + Homebrew 环境。

---

## 0. 先搞清楚整体流程

```
安装 JDK + Android SDK          （只做一次）
        ↓
配置 local.properties / 环境变量
        ↓
npm run cap:sync               （把 public/ 前端同步进 android/ 原生工程）
        ↓
./gradlew assembleDebug        （生成 APK）
        ↓
adb install / 传文件到手机安装
        ↓
App 内点 ⚙️ 填服务器地址 → 连上服务端
```

工程关键信息（一般不用改）：

| 项                     | 值                                     |
| ---------------------- | -------------------------------------- |
| 包名 applicationId     | `com.eateat.app`                       |
| 应用名                 | 今天吃什么                             |
| 原生工程目录           | `android/`                             |
| Web 资源目录           | `public/`                              |
| compileSdk / targetSdk | 36                                     |
| minSdk                 | 24（Android 7.0+）                     |
| AGP / Gradle           | 8.13.0 / 8.14.3                        |
| 需要的 JDK             | **21**（不要用 JDK 26，Gradle 不支持） |
| Capacitor 配置         | `capacitor.config.json`                |

> 重要概念：App 里的网页资源是**本地打包**进 APK 的，不联网也能打开界面；但**数据来自服务端**，所以电脑上的 `npm start` 必须一直跑着，手机通过局域网访问它。

---

## 1. 环境准备（只做一次）

### 1.1 安装 Homebrew

如果还没有：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 1.2 安装 JDK 21

```bash
brew install --cask temurin@21
java -version
```

看到 `openjdk version "21.x"` 即成功。

> ⚠️ 不要用 `brew install --cask temurin`（那是 JDK 26，Gradle 8.14 不兼容，会报 `Unsupported class file major version`）。

### 1.3 安装 Android 命令行工具

```bash
brew install --cask android-commandlinetools
```

安装位置（Apple 芯片）：`/opt/homebrew/share/android-commandlinetools`
Intel 芯片则是：`/usr/local/share/android-commandlinetools`

### 1.4 配置环境变量

把下面两行加到 `~/.zshrc` 末尾（**只需一次**）：

```bash
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
```

> Intel 芯片把 `ANDROID_HOME` 改成 `/usr/local/share/android-commandlinetools`。

让配置生效（或直接开个新终端窗口）：

```bash
source ~/.zshrc
echo $ANDROID_HOME     # 应打印出上面的路径
```

### 1.5 安装工程需要的 SDK 组件

```bash
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

同意许可协议（一路输入 `y` 回车）：

```bash
sdkmanager --licenses
```

### 1.6 验证环境

```bash
sdkmanager --list_installed   # 能看到 platform-tools / platforms;android-36 / build-tools;36.0.0
adb version                   # 能看到 Android Debug Bridge version x.x.x
```

---

## 2. 打包前的项目配置

以下命令都在项目根目录执行：

```bash
cd /Users/Admin/Desktop/eateat/eateateat
```

### 2.1 让 Gradle 找到 SDK

在 `android/local.properties` 写入 SDK 路径（该文件已被 gitignore，每台机器各自生成）：

```bash
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

内容形如：

```properties
sdk.dir=/opt/homebrew/share/android-commandlinetools
```

> 用 Android Studio 打开工程时，IDE 会自动生成这个文件，可以跳过。

### 2.2 同步前端代码到原生工程

**每次改动 `public/` 下的任何前端文件后，都要重新执行这一步**：

```bash
npm run cap:sync
```

它会把 `public/`（`index.html` / `styles.css` / `app.js` / `config.js`）复制进 `android/app/src/main/assets/public`，并更新插件。

### 2.3 确定服务器地址（先想好）

App 需要知道服务端在哪。三种方式（优先级从高到低）：

1. **App 内设置**：打开 App 点右上角 ⚙️ 填地址（推荐，不用重新打包）。
2. **改 `public/config.js`**：把 `apiBase` 改成你的地址，再 `npm run cap:sync`。
3. 留空 → 走同源（仅浏览器直接访问服务端时可用，手机 App 里不可用）。

局域网地址形如 `http://192.168.1.10:3000`。查电脑 IP：

```bash
ipconfig getifaddr en0     # WiFi 网卡，通常就是这个
```

---

## 3. 生成 Debug APK

```bash
cd android
./gradlew assembleDebug
```

> 首次执行会下载 Gradle 8.14.3 发行包和依赖（几百 MB），需要联网，耐心等待。之后再打包会快很多。

成功后 APK 路径：

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Debug 包适合自己安装测试，无需签名、无需开发者账号。

---

## 4. 安装到安卓手机

### 方式 A：数据线 + adb（推荐）

1. 手机「设置 → 关于手机」连点「版本号」7 次，开启开发者模式。
2. 「开发者选项」里打开 **USB 调试**，用数据线连电脑。
3. 手机上弹出「允许 USB 调试」时点允许。

```bash
adb devices          # 确认能看到你的设备
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

看到 `Success` 即安装完成。

### 方式 B：直接传文件安装

1. 把 `app-debug.apk` 通过微信文件传输助手 / 数据线 / 云盘传到手机。
2. 手机上点开 APK，系统提示时允许「安装未知应用」。
3. 完成安装。

---

## 5. 首次运行配置

1. 电脑上启动服务端（保持运行）：

   ```bash
   npm start
   ```

2. 确认手机和电脑连的是**同一个 WiFi**。
3. 打开 App，点右上角 **⚙️**，填入 `http://<电脑IP>:3000`，保存。
4. 如果提示「无法连接服务器」，见第 8 节排查。

---

## 6. 日常开发：改了前端怎么重新打包

```bash
cd /Users/Admin/Desktop/eateat/eateateat
npm run cap:sync
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

> 只改 `public/` 前端 → 必须 `cap:sync`。
> 改了 `server.ts` 后端 → 不用重新打包 App，重启 `npm start` 即可。

---

## 7. 生成正式签名 APK / AAB（可选）

Debug 包不能上架应用商店，正式发布需要签名。

### 7.1 生成签名密钥（只做一次，务必保管好）

```bash
keytool -genkey -v -keystore ~/eateat-release.keystore \
  -alias eateat -keyalg RSA -keysize 2048 -validity 10000
```

按提示设置密码和信息。**这个 keystore 和密码丢了就无法更新已发布的应用，请备份。**

### 7.2 配置签名

新建 `android/keystore.properties`（该文件建议加入 gitignore，不要提交）：

```properties
storeFile=/Users/你的用户名/eateat-release.keystore
storePassword=你的密码
keyAlias=eateat
keyPassword=你的密码
```

编辑 `android/app/build.gradle`：

在文件顶部（`apply plugin` 之前）加：

```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

在 `android { ... }` 块内加入 `signingConfigs`，并让 `release` 使用它：

```groovy
android {
    // ...已有内容...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 7.3 打包正式版

```bash
cd android
./gradlew assembleRelease     # 生成 APK：app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease       # 生成 AAB：app/build/outputs/bundle/release/app-release.aab（上架用）
```

---

## 8. 常见问题排查

| 报错 / 现象                                           | 原因与解决                                                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Unable to locate a Java Runtime`                     | 没装 JDK。执行 `brew install --cask temurin@21`                                                                        |
| `Unsupported class file major version 70` 之类        | JDK 版本太新。确认 `java -version` 是 21，必要时 `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`                    |
| `sdkmanager: command not found`                       | PATH 没生效。重新 `source ~/.zshrc` 或开新终端                                                                         |
| `SDK location not found`                              | 缺 `android/local.properties`，见 2.1                                                                                  |
| `Failed to find target with hash string 'android-36'` | SDK 组件没装，执行 1.5                                                                                                 |
| `You have not accepted the license agreements`        | 执行 `sdkmanager --licenses`                                                                                           |
| 首次打包卡在下载                                      | 在下载 Gradle/依赖，确保网络通畅；公司网络可配代理                                                                     |
| App 显示「无法连接服务器」                            | ①`npm start` 是否在跑；②⚙️ 地址是否正确；③手机电脑是否同 WiFi；④电脑防火墙是否拦截 Node（macOS 首次会弹窗，需允许）    |
| `npm start` 报 `EADDRINUSE`                           | 3000 端口被占用。`lsof -nP -iTCP:3000 -sTCP:LISTEN` 找到进程杀掉，或 `PORT=3001 npm start`（App 地址也要改成对应端口） |
| 改了前端 App 没变化                                   | 忘了 `npm run cap:sync`，同步后重新打包                                                                                |
| 摇一摇没反应                                          | Android 一般可用；需先点一次骰子触发运动权限。桌面浏览器不支持                                                         |
| 安装时提示「应用未安装」                              | 卸载旧版本再装，或确认包名未冲突                                                                                       |

---

## 9. 可选：用 Android Studio 图形化打包

不想敲命令行可以装 Android Studio：

```bash
brew install --cask android-studio
```

1. 打开 Android Studio → **Open** → 选择项目的 `android/` 目录。
2. 首次会提示下载 SDK，按默认点确认。
3. 菜单 **Build → Build Bundle(s) / APK(s) → Build APK(s)**。
4. 完成后右下角点 **locate** 定位到 APK。

> 用 Android Studio 时无需手动配 `local.properties` 和 `ANDROID_HOME`。

---

## 10. iOS 简要说明（补充）

iOS 只能在 macOS 上打包，需要**完整版 Xcode**（不是命令行工具）：

```bash
# 安装 Xcode 后
npm run cap:ios          # = cap sync ios && cap open ios
```

在 Xcode 里选择签名 Team 和设备后运行。真机安装需要一个 Apple ID（免费账号签的 App 7 天过期；上架需付费开发者账号 $99/年）。

---

## 附录 A：命令速查

```bash
# 环境
brew install --cask temurin@21
brew install --cask android-commandlinetools
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
sdkmanager --licenses

# 打包
cd /Users/Admin/Desktop/eateat/eateateat
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
npm run cap:sync
cd android && ./gradlew assembleDebug

# 安装
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# 跑服务端
cd /Users/Admin/Desktop/eateat/eateateat && npm start
ipconfig getifaddr en0
```

## 附录 B：产物与生成目录说明

| 路径                                                       | 说明                                    |
| ---------------------------------------------------------- | --------------------------------------- |
| `android/app/build/outputs/apk/debug/app-debug.apk`        | Debug 安装包                            |
| `android/app/build/outputs/apk/release/app-release.apk`    | Release 安装包（签名后）                |
| `android/app/build/outputs/bundle/release/app-release.aab` | 上架 Play 商店用                        |
| `android/app/src/main/assets/public/`                      | `cap sync` 复制进去的前端资源（勿手改） |
| `android/local.properties`                                 | SDK 路径（本机生成，gitignore）         |
| `public/config.js`                                         | 服务器地址默认值                        |
