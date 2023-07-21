import React from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
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

const Section = ({ title, description }) => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1px solid black',
            width: '250px',
            marginTop: '56px',
            color: 'black',
        }}
    >
        <div style={{ height: '24px' }} />
        <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: '28px' }}>
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
            <div
                style={{
                    fontSize: '96px',
                    fontWeight: 700,
                    lineHeight: '100%',
                    alignSelf: 'center',
                }}
            >
                A protocol built for handling user data anonymously.
            </div>
            <div style={{ height: '24px' }} />
            <div className={styles.paragraph} style={{ maxWidth: '768px' }}>
                UniRep is a Zero-Knowledge Protocol for user data & reputation
                management. We use pioneering technology to offer a space for
                developers and users alike to explore the potential of
                privacy-centered online interactions.
            </div>
            <div style={{ height: '24px' }} />
            <div style={{ alignSelf: 'flex-start' }}>
                <Button href="/docs/welcome">Start building</Button>
            </div>
            <div style={{ height: '124px' }} />
            <div
                style={{
                    background:
                        'linear-gradient(135.45deg, #FEE4CB 0%, #DBF2F2 95.26%)',
                    borderRadius: '32px',
                    padding: '104px 113px 104px 113px',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    style={{
                        color: 'black',
                        fontSize: '56px',
                        fontWeight: 700,
                        lineHeight: '53px',
                    }}
                >
                    Use UniRep to build a Reddit clone
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                    }}
                >
                    <Section
                        title="Extensible & Interoperable"
                        description="Designed for scalability, uses smart contracts, ZK circuits, and flexible data structures to enable seamless app integration."
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
                        style={{ backgroundColor: 'white', color: 'black' }}
                    >
                        Learn more
                    </Button>
                </div>
            </div>
            <div style={{ height: '124px' }} />
            <div style={{ display: 'flex' }}>
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
                        Users read the state of the unirep system from the
                        unirep contract. Once a user knows this state they can
                        make a ZK proof of some data and submit it to the
                        attester. Once the attester validates the proof they can
                        submit attestations to the unirep contract.
                    </div>
                    <div style={{ height: '24px' }} />
                    <div className={styles.paragraph}>
                        Attestations change user data, and users read changes
                        from the unirep contract to construct their most up to
                        date state.
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
                    To enable developers like you to harness the full potential
                    of UniRep, we've crafted a range of powerful tools designed
                    to simplify and streamline the development process.
                </div>
            </div>
            <div style={{ height: '100px' }} />
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
                        <Button href="https://github.com/unirep/create-unirep-app#readme">
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
                        fontSize: '56px',
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
