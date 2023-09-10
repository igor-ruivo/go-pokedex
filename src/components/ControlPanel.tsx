import "./ControlPanel.scss";
import {
    Button,
    FormControlLabel,
    FormGroup,
    Stack,
    Switch,
    TextField
} from "@mui/material";
import '../styles/theme-variables.scss';
import { useContext } from "react";
import ThemeContext from "../contexts/theme-context";

interface IControlPanelProps {
    onSearchInputChange: React.Dispatch<React.SetStateAction<string>>
}

const ControlPanel = ({onSearchInputChange}: IControlPanelProps) => {
    const { theme, setTheme } = useContext(ThemeContext);

    const handleThemeChange = () => {
        const isCurrentDark = theme === "dark";
        setTheme(isCurrentDark ? "light" : "dark");
        localStorage.setItem('default-theme', isCurrentDark ? "light" : "dark");
    };

    return (
    <div className="top-pane">
        <Stack
            direction="column"
            spacing={2}
            justifyContent="center"
            alignItems="center"
        >
            <FormGroup>
                <FormControlLabel
                    control={
                        <Switch
                            color="default"
                            checked={theme === "dark"}
                            onChange={handleThemeChange}
                            inputProps={{ "aria-label": "controlled" }}
                        />
                    }
                    label={"Dark mode"}
                />

                <FormControlLabel
                    control={
                        <Switch
                            color="default"
                            className="toggle-switch"
                            checked={true}
                            inputProps={{ "aria-label": "controlled" }}
                        />
                    }
                    label={"Only released in Pokémon GO"}
                />
            </FormGroup>
            <TextField
                id="outlined-basic"
                onChange={e => onSearchInputChange(e.target.value)}
                label="Search Pokémon"
                variant="outlined" />
            <Button
                variant="contained"
            >
                {"a"}
            </Button>
            <Button
                variant="contained"
            >
                {"b"}
            </Button>
        </Stack>
    </div>
    );
}

export default ControlPanel