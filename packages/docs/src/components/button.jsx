import React from 'react'

export default ({ style, children, href }) => {
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
