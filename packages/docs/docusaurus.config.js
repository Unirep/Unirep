// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github')
const darkCodeTheme = require('prism-react-renderer/themes/dracula')
const math = require('remark-math')
const katex = require('rehype-katex')

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: 'UniRep Docs',
    tagline: 'Universal Reputation - Private user data & Provable reputation',
    url: 'https://developer.unirep.io',
    baseUrl: '/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    favicon: 'img/unirep-icon.png',

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'Unirep', // Usually your GitHub org/user name.
    projectName: 'Unirep', // Usually your repo name.

    // Even if you don't use internalization, you can use this field to set useful
    // metadata like html lang. For example, if your site is Chinese, you may want
    // to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: require.resolve('./sidebars.js'),
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        'https://github.com/Unirep/Unirep/tree/main/packages/docs',
                    lastVersion: '2.0.0-beta-4',
                    versions: {
                        current: {
                            label: 'next',
                            path: 'next',
                        },
                    },
                    remarkPlugins: [math],
                    rehypePlugins: [katex],
                },
                blog: {
                    showReadingTime: true,
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        'https://github.com/Unirep/Unirep/tree/main/packages/docs',
                },
                theme: {
                    customCss: require.resolve('./src/css/custom.css'),
                },
            }),
        ],
    ],

    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            navbar: {
                title: 'UniRep',
                logo: {
                    alt: 'UniRep logo',
                    src: 'img/unirep-icon.png',
                },
                items: [
                    {
                        type: 'doc',
                        docId: 'welcome',
                        position: 'left',
                        label: 'Docs',
                    },
                    {
                        to: 'docs/faqs',
                        label: 'FAQs',
                        position: 'left',
                    },
                    { to: '/blog', label: 'Blog', position: 'left' },
                    {
                        type: 'docsVersionDropdown',
                        dropdownActiveClassDisabled: true,
                        position: 'right',
                    },
                    {
                        href: 'https://github.com/unirep/unirep',
                        position: 'right',
                        className: 'header-github-link',
                        'aria-label': 'GitHub repository',
                    },
                ],
            },
            footer: {
                links: [
                    {
                        title: 'Docs',
                        items: [
                            {
                                label: 'Introduction',
                                to: '/docs/welcome',
                            },
                        ],
                    },
                    {
                        title: 'Community',
                        items: [
                            {
                                label: 'Discord',
                                href: 'https://discord.gg/VzMMDJmYc5',
                            },
                            {
                                label: 'Twitter',
                                href: 'https://twitter.com/UniRep_protocol',
                            },
                            {
                                label: 'Feedback',
                                href: 'https://airtable.com/shroZ9JGQLMznKU18',
                            },
                        ],
                    },
                    {
                        title: 'More',
                        items: [
                            {
                                label: 'Blog',
                                to: '/blog',
                            },
                            {
                                label: 'Explorer',
                                href: 'https://explorer.unirep.io',
                            },
                            {
                                label: 'GitHub',
                                href: 'https://github.com/unirep',
                            },
                        ],
                    },
                ],
                copyright: `MIT licensed ✨`,
            },
            prism: {
                theme: lightCodeTheme,
                darkTheme: darkCodeTheme,
                additionalLanguages: ['typescript', 'solidity'],
            },
            algolia: {
                appId: 'HEISL6JPF1',
                apiKey: '698ea9abfb5063c0b29978afaeda4288',
                indexName: 'developer-unirep',
                contextualSearch: true,
            },
            matomo: {
                matomoUrl: 'https://psedev.matomo.cloud/',
                siteId: '6',
                phpLoader: 'matomo.php',
                jsLoader: 'matomo.js',
            },
        }),
    plugins: [
        function svgFix() {
            return {
                name: 'svg-fix',
                configureWebpack(config) {
                    const svgRuleIndex = config.module.rules.findIndex((r) =>
                        r.test.test('file.svg')
                    )
                    const svgrConfigIndex = config.module.rules[
                        svgRuleIndex
                    ].oneOf.findIndex((r) => {
                        if (!Array.isArray(r.use) || r.use.length === 0)
                            return false
                        return r.use[0].loader.indexOf('@svgr/webpack') !== -1
                    })
                    if (svgRuleIndex === -1 || svgrConfigIndex === -1) return

                    config.module.rules[svgRuleIndex].oneOf[
                        svgrConfigIndex
                    ].use[0].options.svgoConfig.plugins[0].params.overrides.cleanupIDs = false
                },
            }
        },
        'docusaurus-plugin-matomo',
        [
            'docusaurus-plugin-typedoc',
            {
                id: 'utils',
                entryPoints: ['../utils/src/index.ts'],
                tsconfig: '../utils/tsconfig.json',
                out: 'utils-api',
                sidebar: {
                    categoryLabel: 'Utils',
                    position: 0,
                },
            },
        ],
        [
            'docusaurus-plugin-typedoc',
            {
                id: 'circuits',
                entryPoints: [
                    '../circuits/src/index.ts',
                    '../circuits/provers/web.ts',
                    '../circuits/provers/defaultProver.ts',
                ],
                tsconfig: '../circuits/tsconfig.json',
                out: 'circuits-api',
                sidebar: {
                    categoryLabel: 'Circuits',
                    position: 0,
                },
            },
        ],
        [
            'docusaurus-plugin-typedoc',
            {
                id: 'contracts',
                entryPoints: [
                    '../contracts/src/index.ts',
                    '../contracts/typechain/index.ts',
                    '../contracts/deploy/index.ts',
                ],
                tsconfig: '../contracts/tsconfig.json',
                out: 'contracts-api',
                sidebar: {
                    categoryLabel: 'Conctracts',
                    position: 0,
                },
            },
        ],
        [
            'docusaurus-plugin-typedoc',
            {
                id: 'core',
                entryPoints: ['../core/src/index.ts'],
                tsconfig: '../core/tsconfig.json',
                out: 'core-api',
                sidebar: {
                    categoryLabel: 'Core',
                    position: 0,
                },
            },
        ],
    ],
}

module.exports = config
