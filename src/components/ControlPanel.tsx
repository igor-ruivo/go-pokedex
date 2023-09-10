import "./ControlPanel.scss";
import {
    Button,
    FormControlLabel,
    FormGroup,
    Stack,
    Switch
} from "@mui/material";
import '../styles/theme-variables.scss';
import { useContext } from "react";
import ThemeContext from "../contexts/theme-context";

const ControlPanel = () => {
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
                            className="toggle-switch"
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
            <Button
                variant="contained"
            >
                {"z"}
            </Button>
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