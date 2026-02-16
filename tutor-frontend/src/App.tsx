import { Switch, Route, Redirect } from "wouter";
import TutorDashboardPage from "@/pages/TutorDashboardPage";
import TutorLoginPage from "@/pages/TutorLoginPage";
import { Toaster } from "@/components/ui/toaster";

function App() {
    return (
        <>
            <Switch>
                <Route path="/login" component={TutorLoginPage} />
                <Route path="/dashboard" component={TutorDashboardPage} />
                <Route path="/">
                    <Redirect to="/login" />
                </Route>
            </Switch>
            <Toaster />
        </>
    );
}

export default App;
