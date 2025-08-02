import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { EightPokerCard } from './EightPokerCard';

const CompactCardRow = ({ cards }) => {
    if (!cards || cards.length === 0) return <Box sx={{ minHeight: '80px' }} />;

    const cardWidth = 60;
    const overlap = 0.7; // 70% overlap
    return (
        <Stack
            direction="row"
            spacing={`-${cardWidth * overlap}px`}
            sx={{
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                position: 'relative',
            }}
        >
            {cards.map((card, index) => (
                <Box
                    key={card.id}
                    sx={{
                        zIndex: 10 + index,
                    }}
                >
                    <EightPokerCard card={card} isSelectable={false} />
                </Box>
            ))}
        </Stack>
    );
};

const EightCompactHandDisplay = ({ player }) => {
    if (!player) return null;
    return (
        <Paper
            elevation={3}
            sx={{
                p: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                color: 'white',
                width: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 1 }}>
                {player.name}
            </Typography>
            <Box sx={{ flexGrow: 1, height: '100%', justifyContent: 'space-around', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {['front', 'middle', 'back'].map(area => (
                    <Box key={area} sx={{ height: '30%', width: '100%' }}>
                        <CompactCardRow cards={player.rows[area]} />
                    </Box>
                ))}
            </Box>
        </Paper>
    );
};

export default EightCompactHandDisplay;