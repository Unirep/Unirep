import React from 'react'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
// import { AnimatedText } from '../components/AnimateText'
import HomepageFeatures from '@site/src/components/HomepageFeatures'
import { Hero } from '@site/src/components/Hero'

import styles from './index.module.css'

const HeroImage = require('@site/static/img/img-hero.svg').default
const FooterImage = require('@site/static/img/img-footer.png').default
const DiagramImage = require('@site/static/img/unirep-data-diagram.svg').default
const ExampleImage1 = require('@site/static/img/example1.png').default
const ExampleImage2 = require('@site/static/img/example2.png').default

const Button = ({ style, children, href }) => {
    return (
        <a href={href} target="_blank">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <div
                    style={{
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#A3ECE1',
                        borderRadius: '32px',
                        height: '64px',
                        fontSize: '20px',
                        fontWeight: 600,
                        lineHeight: '28px',
                        color: 'black',
                        userSelect: 'none',
                        padding: '18px 40px',
                        ...(style ?? {}),
                    }}
                >
                    {children}
                </div>
            </div>
        </a>
    )
}

const FADE_INTERVAL_MS = 1750
const WORD_CHANGE_INTERVAL_MS = FADE_INTERVAL_MS * 2
const WORDS_TO_ANIMATE = [
    'Reddit clone',
    'p2p marketplace',
    'anon voting',
    'Upwork clone',
    'p2p lending',
    'anon journalism',
    'verified product review',
    'ebay clone',
    'anon streaming',
]

const AnimatedText = () => {
    const [fadeProp, setFadeProp] = useState({ fade: 'fade-in' })
    const [wordOrder, setWordOrder] = useState(0)

    useEffect(() => {
        const fadeTimeout = setInterval(() => {
            fadeProp.fade === 'fade-in'
                ? setFadeProp({ fade: 'fade-out' })
                : setFadeProp({ fade: 'fade-in' })
        }, FADE_INTERVAL_MS)

        return () => clearInterval(fadeTimeout)
    }, [fadeProp])

    useEffect(() => {
        const wordTimeout = setInterval(() => {
            setWordOrder(
                (prevWordOrder) => (prevWordOrder + 1) % WORDS_TO_ANIMATE.length
            )
        }, WORD_CHANGE_INTERVAL_MS)

        return () => clearInterval(wordTimeout)
    }, [])

    return (
        // <div className={styles.rotatingTextWrapper} >
        <div className={styles.animated}>{WORDS_TO_ANIMATE[wordOrder]}</div>
        // </div>
    )
}

const Section = ({ title, description }) => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1px solid black',
            width: '250px',
            marginTop: '30px',
            color: 'black',
        }}
    >
        <div style={{ height: '24px' }} />
        <div
            style={{
                fontSize: '20px',
                fontWeight: 700,
                lineHeight: '28px',
                width: '180px',
            }}
        >
            {title}
        </div>
        <div style={{ height: '24px' }} />
        <div className={styles.paragraph}>{description}</div>
    </div>
)

function HomepageHeader() {
    const { siteConfig } = useDocusaurusContext()
    return (
        <div
            style={{
                maxWidth: '1196px',
                margin: 'auto',
                paddingLeft: '16px',
                paddingRight: '16px',
                paddingTop: '104px',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div className="brand-h1">
                A protocol built to handle anonymous user data.
            </div>
            <div style={{ height: '20px' }} />
            <div className="brand-lg" style={{ maxWidth: '768px' }}>
                UniRep is a Zero-Knowledge Protocol for user data & reputation
                management. We use pioneering technology to offer a space for
                developers and users alike to explore the potential of
                privacy-centered online interactions.
            </div>
            <div style={{ height: '24px' }} />
            <div style={{ alignSelf: 'flex-start' }}>
                <Button href="/docs/welcome">Start building</Button>
            </div>

            <div className={styles.buildContainer}>
                <div className="brand-h3">Use UniRep to build</div>
                <AnimatedText />

                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                    }}
                >
                    <Section
                        title="Extensible & Interoperable"
                        description="Designed for scalability: smart contracts, ZK circuits, and flexible data structures enable seamless app integration."
                    />
                    <Section
                        title="Anonymity & User Sovereignty"
                        description="Dynamic pseudonyms and secure data storage ensure anonymity, while zero-knowledge proofs allow users to verify past identifiers."
                    />
                    <Section
                        title="Customization & Data Security"
                        description="Trustless interoperability fosters innovation and upholds user autonomy— data is only revealed or altered with the user's consent."
                    />
                </div>
                <div style={{ height: '56px' }} />
                <div style={{ alignSelf: 'flex-start' }}>
                    <Button
                        href="/docs/what-can-i-build"
                        style={{ backgroundColor: 'white', color: 'black' }}
                    >
                        Learn more
                    </Button>
                </div>
            </div>
            <div style={{ height: '124px' }} />
            <div className={styles.diagram}>
                <DiagramImage
                    height="auto"
                    style={{ maxHeight: '611px' }}
                    role="img"
                />
                <div style={{ width: '32px' }} />
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        maxWidth: '400px',
                        justifyContent: 'center',
                    }}
                >
                    <div className={styles.subheader}>How it works</div>
                    <div style={{ height: '24px' }} />
                    <div className={styles.paragraph}>
                        Users read the state of the UniRep system from the
                        UniRep contract. Once users know this state they can
                        make ZK proofs of some data and submit to an attester.
                        Attesters validate proofs before submiting attestations
                        to the UniRep contract.
                    </div>
                    <div style={{ height: '24px' }} />
                    <div className={styles.paragraph}>
                        Attestations change user data, and users read changes
                        from the UniRep contract to construct their most
                        up-to-date state.
                    </div>
                </div>
            </div>
            <div style={{ height: '124px' }} />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <div className={styles.subheader}>Our tools</div>
                <div style={{ height: '24px' }} />
                <div
                    className={styles.paragraph}
                    style={{ maxWidth: '1089px', textAlign: 'center' }}
                >
                    To enable developers to harness the full potential of
                    UniRep, we've crafted a range of powerful tools designed to
                    simplify and streamline the development process.
                </div>
            </div>
            <div style={{ height: '30px' }} />
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <div
                    style={{
                        margin: '24px',
                        maxWidth: '500px',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div
                        style={{
                            borderRadius: '32px',
                            backgroundColor: '#FEE4CB',
                            padding: '53px 65px',
                        }}
                    >
                        <img src={ExampleImage1} />
                    </div>
                    <div style={{ height: '24px' }} />
                    <div
                        style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            lineHeight: '24px',
                        }}
                    >
                        CLI tool
                    </div>
                    <div style={{ height: '24px' }} />
                    <div className={styles.paragraph}>
                        The create-unirep-app package provides a convenient and
                        efficient way to build applications that leverage the
                        power of UniRep.
                    </div>
                    <div style={{ height: '24px' }} />
                    <div style={{ alignSelf: 'flex-start' }}>
                        <Button href="/docs/getting-started/create-unirep-app">
                            Get started
                        </Button>
                    </div>
                </div>
                <div
                    style={{
                        margin: '24px',
                        maxWidth: '500px',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div
                        style={{
                            borderRadius: '32px',
                            backgroundColor: '#DBF2F2',
                            padding: '53px 65px',
                        }}
                    >
                        <img src={ExampleImage2} />
                    </div>
                    <div style={{ height: '24px' }} />
                    <div
                        style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            lineHeight: '24px',
                        }}
                    >
                        Explorer
                    </div>
                    <div style={{ height: '24px' }} />
                    <div className={styles.paragraph}>
                        UniRep Explorer is a utility for discovering apps built
                        on the protocol & inspecting the attestation and user
                        data changes for all.
                    </div>
                    <div style={{ height: '24px' }} />
                    <div style={{ alignSelf: 'flex-start' }}>
                        <Button href="https://explorer.unirep.io">
                            Launch explorer
                        </Button>
                    </div>
                </div>
            </div>
            <div style={{ height: '124px' }} />
        </div>
    )
}

export default function Home() {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout
            title={`${siteConfig.title}`}
            description="Universal Reputation is an anonymous reputation protocol."
        >
            <HomepageHeader />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: `url(${FooterImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: '50% 50%',
                    height: '300px',
                }}
            >
                <div
                    style={{
                        fontSize: '30px',
                        fontWeight: 700,
                        color: 'black',
                    }}
                >
                    Got questions?
                </div>
                <div
                    className={styles.paragraph}
                    style={{
                        color: 'black',
                    }}
                >
                    <a
                        href="https://discord.gg/VzMMDJmYc5"
                        style={{ color: 'black' }}
                    >
                        Join our Discord
                    </a>
                </div>
            </div>
        </Layout>
    )
}
