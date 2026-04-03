import {MantineProvider} from "@mantine/core";
import {Notifications} from "@mantine/notifications";
import {customTheme} from "./theme";
import MontserratFont from "./fonts/MontserratFont";
import {AuthProvider} from "./contexts/AuthContext";

import './App.css'
import {RouterProvider} from "react-router-dom";
import router from "./routes";

function App() {
    return (
        <>
            <MantineProvider theme={customTheme}>
                <AuthProvider>
                    <RouterProvider router={router}/>
                    <MontserratFont/>
                    <Notifications/>
                </AuthProvider>
            </MantineProvider>
        </>
    )
}

export default App
