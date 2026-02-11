// ==UserScript==
// @name         CordCloud 每日签到
// @namespace    http://scriptcat.org/
// @version      2.0.0
// @description  CordCloud 机场每日自动签到，支持后台定时执行和浏览器通知
// @author       Ayong
// @icon         https://cordcloud.biz/favicon.ico
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @connect      cordcloud.biz
// @crontab      * 11-23 once * *
// @background
// @license      MIT
// ==/UserScript==

/**
 * CordCloud 自动签到脚本
 * 适配脚本猫后台定时执行
 */

return new Promise((resolve, reject) => {
    const CONFIG = {
        baseUrl: 'https://cordcloud.biz',
        checkinApi: '/user/checkin',
        userApi: '/user',
        timeout: 15000,  // 15秒超时
        maxRetries: 3    // 最大重试次数
    };

    let retryCount = 0;

    // 日志输出
    const log = (msg) => {
        GM_log(`[CordCloud签到] ${msg}`);
    };

    // 显示通知
    const notify = (title, text) => {
        GM_notification({
            title: title,
            text: text,
            timeout: 10000
        });
    };

    // 执行签到
    const doCheckin = () => {
        log('开始执行签到...');
        
        GM_xmlhttpRequest({
            method: 'POST',
            url: CONFIG.baseUrl + CONFIG.checkinApi,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: CONFIG.timeout,
            onload: (xhr) => {
                try {
                    // 检查是否跳转到登录页
                    if (xhr.finalUrl && xhr.finalUrl.includes('/auth/login')) {
                        log('用户未登录');
                        notify('CordCloud 签到失败', '请先登录账号');
                        reject('未登录');
                        return;
                    }

                    const data = JSON.parse(xhr.responseText);
                    
                    if (xhr.status === 200 && data.ret === 1) {
                        log(`签到成功: ${data.msg}`);
                        notify('✅ CordCloud 签到成功', data.msg || '签到完成');
                        resolve(data.msg || '签到成功');
                    } else {
                        log(`签到失败: ${data.msg || '未知错误'}`);
                        notify('❌ CordCloud 签到失败', data.msg || '请手动检查');
                        reject(data.msg || '签到失败');
                    }
                } catch (e) {
                    log(`响应解析失败: ${e.message}`);
                    handleRetry('响应解析失败');
                }
            },
            onerror: (e) => {
                log(`网络请求错误: ${e.message}`);
                handleRetry('网络请求错误');
            },
            ontimeout: () => {
                log('请求超时');
                handleRetry('请求超时');
            }
        });
    };

    // 错误处理和重试
    const handleRetry = (errorMsg) => {
        retryCount++;
        if (retryCount >= CONFIG.maxRetries) {
            log(`重试次数已达上限 (${CONFIG.maxRetries})`);
            notify('⚠️ CordCloud 签到失败', `重试${CONFIG.maxRetries}次仍失败，请手动签到`);
            reject(`重试${CONFIG.maxRetries}次失败: ${errorMsg}`);
        } else {
            const delay = 3000 + Math.random() * 2000;  // 3-5秒随机延迟
            log(`将在 ${Math.round(delay/1000)} 秒后重试 (${retryCount}/${CONFIG.maxRetries})`);
            setTimeout(doCheckin, delay);
        }
    };

    // 启动签到
    log('脚本启动');
    doCheckin();
});