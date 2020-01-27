/* eslint-disable no-console */
const axios = require('axios');
const unzip = require('unzipper');
const mkdirp = require('mkdirp');
const fs = require('fs');
const axiosRetry = require('axios-retry');

const blackList = [
  'humbug',
  'metrics-datadog',
  'multi-branch-priority-sorter',
  'cloudbees-plugin-gateway', // docs still exist but is deprecated
  'ibm-security-appscansource-scanner',
  'ibm-continuous-release',
  'pipeline-huaweicloud-plugin',
  'jenkinspider',
  'pipeline-restful-api',
  'aws-yum-parameter',
  'aqua-microscanner',
  'blueocean-core-js',
  'alauda-devops-credentials-provider',
  'working-hours',
  'jnr-posix-api',
  'behave-testresults-publisher',
  'rallyBuild',
  'jna-posix-api',
  'jenkins-multijob-plugin', // https://wiki.jenkins.io/display/JENKINS/Multijob+Plugin maybe?
  'pipeline-timeline',
  'dlisting-cov',
  'alauda-devops-pipeline',
  'ColumnsPlugin',
  'database-drizzle',
  'non-dynamic-hello-world',
  'alauda-kubernetes-support',
  'sourcemonitor',
  'autocomplete-parameter',
  'ikachan',
  'devstack',
  'dynatrace-dashboard',
  'event-announcer', // https://wiki.jenkins.io/display/JENKINS/My+Plugin
  'webhook-eventsource',
  'flexteam',
  'matrix-combinations-parameter',
  'wso2id-oauth',
  'suite-test-groups-publisher',
  'aqua-serverless',
  'jwt-support',
  'network-monitor',
  'jprt',
  'h2-api',
  'humio',
  'codeclimate-plugin', // https://wiki.jenkins-ci.org/display/JENKINS/TODO+Plugin
  'mysql-api',
  'disable-github-multibranch-status',
  'pipeline-deploymon',
];

const rewrite = {
  // play-autotest-plugin
  'https://wiki.jenkins-ci.org/display/JENKINS/Play%21+Framework+Plugin': 'https://wiki.jenkins.io/display/JENKINS/Play+Framework+Plugin',
  // github-scm-trait-notification-context
  'https://wiki.jenkins-ci.org/display/JENKINS/Github+Custom+Notification+Context+SCM+Behaviour': 'https://wiki.jenkins.io/display/JENKINS/Github+Custom+Notification+Context+SCM+Behaviour+Plugin',
  // 'ca-apm'
  'https://wiki.jenkins-ci.org/display/JENKINS/CA+APM+Plugin': 'https://wiki.jenkins.io/display/JENKINS/CA+APM+Plugin+1.x',
  'https://wiki.jenkins-ci.org/display/JENKINS/Comments+Remover+Plugin': 'https://wiki.jenkins.io/display/JENKINS/XComment.io+-+Comments+Remover+Plugin'
}

axiosRetry(axios, {retries: 3});

const requestGET = (url) => {
    return axios
        .get(url)
        .then((results) => {
            if (results.status !== 200) {
                throw results.data;
            }
            return results.data;
        });
};

const pluginWikiUrlRe = /^https?:\/\/wiki.jenkins(?:-ci.org|.io)\/display\/(?:jenkins|hudson)\/([^/]*)\/?$/i;

const fetchPluginData = async () => {
    const promises = [];
    let page = 1;
    let pluginsContainer;
    do {
        const url = `https://plugins.jenkins.io/api/plugins/?limit=100&page=${page}`;
        pluginsContainer = await requestGET(url);

        for (const plugin of pluginsContainer.plugins) {

            // perform any rewrites
            plugin.wiki.url = rewrite[plugin.wiki.url] || plugin.wiki.url;

            if (!pluginWikiUrlRe.test(plugin.wiki.url)) {
                continue;
            }

            if (blackList.includes(plugin.name)) {
                continue;
            }

            const dir = `content/${plugin.name}`;
            if (fs.existsSync(`${dir}/README.adoc`)) {
                continue;
            }

            try {
                console.log(`[${page}] ${plugin.name}`);
                const url = `https://jenkins-wiki-exporter.g4v.dev/confluence-url/${encodeURIComponent(plugin.wiki.url)}.adoc.zip`;
                // const url = `https://jenkins-wiki-exporter.jenkins.io/confluence-url/${encodeURIComponent(plugin.wiki.url)}.adoc.zip`;
                mkdirp(dir);
                const response = await axios({
                    method: 'get',
                    url,
                    responseType: 'stream'
                })
                await new Promise(function(resolve, reject) {
                  response.data.pipe(unzip.Extract({ path: dir }))
                    .on('error', reject)
                    .on('finish', resolve);
                });
            } catch (e) {
                console.log(plugin.wiki.url);
                throw e;
            }
        }
        page = pluginsContainer.page + 1;
    } while (!page || pluginsContainer.page < pluginsContainer.pages);
};

fetchPluginData()
