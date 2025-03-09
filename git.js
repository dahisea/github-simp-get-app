let currentPage = 1;
let perPage = 10;
let totalPages = 1;
let currentRepo = {
    username: '',
    repo: ''
};
let proxy = 'api-red-gh.zh-cn.eu.org';
let currentMode = 'releases'; // 当前模式：releases 或 search

// 获取代理 URL
function getProxyUrl(url) {
    const selectedProxy = document.getElementById('proxy').value;
    if (selectedProxy === 'api-red-gh.zh-cn.eu.org') {
        return url.replace('https://github.com', `https://${selectedProxy}`);
    } else {
        return `https://${selectedProxy}/https://github.com${new URL(url).pathname}`;
    }
}

// 更新每页数量
function updatePerPage() {
    perPage = parseInt(document.getElementById('perPage').value);
    if (currentMode === 'releases') {
        fetchReleases(1);
    } else if (currentMode === 'search') {
        searchRepositories(1);
    }
}

// 获取发行版本
async function fetchReleases(page) {
    const username = document.getElementById('username').value.trim();
    const repo = document.getElementById('repo').value.trim();
    const resultsDiv = document.getElementById('results');

    if (!username || !repo) {
        alert('请输入用户名和仓库名称！');
        return;
    }

    currentRepo = {
        username,
        repo
    };
    currentPage = page;
    currentMode = 'releases';
    proxy = document.getElementById('proxy').value;

    resultsDiv.innerHTML = '<p>加载中...</p>';
    await loadReleasesPage(page);
}

// 加载指定页的发行版本
async function loadReleasesPage(page) {
    const {
        username,
        repo
    } = currentRepo;
    const resultsDiv = document.getElementById('results');

    try {
        const response = await fetch(
            `https://api.github.com/repos/${username}/${repo}/releases?per_page=${perPage}&page=${page}`
        );
        if (!response.ok) {
            throw new Error('请求失败，请检查用户名和仓库名称是否正确。');
        }
        const releases = await response.json();
        const linkHeader = response.headers.get('Link');
        totalPages = parseTotalPagesFromLinkHeader(linkHeader);
        displayReleases(releases);
        updatePageInfo(page, totalPages);
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}

// 显示发行版本
function displayReleases(releases) {
    const resultsDiv = document.getElementById('results');
    if (releases.length === 0) {
        resultsDiv.innerHTML = '<p>未找到任何发行版本。</p>';
        return;
    }

    let html = '';
    releases.forEach(release => {
        html += `
                    <div class="card">
                        <h3>${release.tag_name} - ${release.name}</h3>
                        <p>发布日期：${new Date(release.published_at).toLocaleDateString()}</p>
                        <div class="description">
                            <strong>简介：</strong>
                            <div>${marked.parse(release.body || '无简介')}</div>
                        </div>
                        <div class="assets">
                            <strong>附件：</strong>
                            ${release.assets.map(asset => `
                                <a href="${getProxyUrl(asset.browser_download_url)}" target="_blank">${asset.name}</a>
                            `).join('')}
                        </div>
                    </div>
                `;
    });

    resultsDiv.innerHTML = html;
}

// 搜索仓库
async function searchRepositories(page) {
    const query = document.getElementById('searchQuery').value.trim();
    const resultsDiv = document.getElementById('results');

    if (!query) {
        alert('请输入搜索关键词！');
        return;
    }

    currentPage = page;
    currentMode = 'search';
    resultsDiv.innerHTML = '<p>加载中...</p>';

    try {
        const response = await fetch(
            `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`
        );
        if (!response.ok) {
            throw new Error('请求失败，请检查网络或关键词是否正确。');
        }
        const data = await response.json();
        const totalResults = data.total_count;
        totalPages = Math.ceil(totalResults / perPage);
        displaySearchResults(data.items);
        updatePageInfo(page, totalPages);
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}

// 显示搜索结果
function displaySearchResults(results) {
    const resultsDiv = document.getElementById('results');
    if (results.length === 0) {
        resultsDiv.innerHTML = '<p>未找到任何仓库。</p>';
        return;
    }

    let html = '';
    results.forEach(repo => {
        html += `
                    <div class="card">
                        <h3><a href="${repo.html_url}" target="_blank">${repo.full_name}</a></h3>
                        <p>描述：${repo.description || '无描述'}</p>
                        <p>星标数：${repo.stargazers_count}</p>
                        <p>更新时间：${new Date(repo.updated_at).toLocaleDateString()}</p>
                        <button onclick="setRepo('${repo.owner.login}', '${repo.name}')">
                            <i class="material-icons">get_app</i>查看发行版本
                        </button>
                    </div>
                `;
    });

    resultsDiv.innerHTML = html;
}

// 设置用户名和仓库名
function setRepo(username, repo) {
    document.getElementById('username').value = username;
    document.getElementById('repo').value = repo;
}

// 更新分页信息
function updatePageInfo(page, totalPages) {
    document.getElementById('pageInfo').textContent = `第 ${page} 页，共 ${totalPages} 页`;
}

// 解析 Link 头部获取总页数
function parseTotalPagesFromLinkHeader(linkHeader) {
    if (!linkHeader) return 1;
    const matches = linkHeader.match(/&page=(\d+)>; rel="last"/);
    return matches ? parseInt(matches[1]) : 1;
}

// 上一页
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        if (currentMode === 'releases') {
            fetchReleases(currentPage);
        } else if (currentMode === 'search') {
            searchRepositories(currentPage);
        }
    }
}

// 下一页
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        if (currentMode === 'releases') {
            fetchReleases(currentPage);
        } else if (currentMode === 'search') {
            searchRepositories(currentPage);
        }
    }
}