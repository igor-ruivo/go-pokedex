import { Box, Typography } from "@mui/material";
import "./LevelSlider.css";
import Slider from '@mui/material/Slider';

interface ILevelSlider {
    levelCap: number;
    setLevelCap: (_: React.SetStateAction<number>) => void,
}

const LevelSlider = ({levelCap, setLevelCap}: ILevelSlider) => {
    return <div className = "levelCapInput"><Box>
                <Slider
                    aria-label="Pokémon level cap"
                    onChange={(_event, newValue) => setLevelCap(newValue as number)}
                    valueLabelDisplay="on"
                    min={40}
                    max={51}
                    step={0.5}
                    value={levelCap}
                />
            <Typography id="input-slider" gutterBottom>
                Pokémon level cap
            </Typography>
            
            </Box></div>;
}

export default LevelSlider;