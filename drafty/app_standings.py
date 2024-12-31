import streamlit as st
import pandas as pd

# Create the line chart with plotly for more customization
import plotly.express as px


def update_team_totals(bracket_dfs, teams):
    st.session_state.team_totals = {
        team["team_name"]: 0 for team in bracket_dfs[0].to_dict("records")
    }
    for df in bracket_dfs:
        if len(df) >= 1:
            winner = df.iloc[0]["team_name"]

            st.session_state.team_totals[winner] += 50
        if len(df) >= 2:
            runner_up = df.iloc[1]["team_name"]
            st.session_state.team_totals[runner_up] += 25


# @st.cache_data
def load_current_gw_teams():
    # Read current gw, use as gw[0]
    with open(r"data_gw", "r") as fp:
        gw = fp.readlines()
    # Read in team names
    with open(r"data_teams", "r") as fp:
        t = fp.readlines()
        teams = [i.strip() for i in t]

    return gw[0], teams


# @st.cache_data
def load_bracket_dfs():
    bracket_1 = pd.read_csv("data/results_1.csv")
    bracket_1["points"] = bracket_1["points"].astype(int)
    bracket_1 = bracket_1.sort_values(by="points", ascending=False)

    bracket_2 = pd.read_csv("data/results_2.csv")
    bracket_2["points"] = bracket_2["points"].astype(int)
    bracket_2 = bracket_2.sort_values(by="points", ascending=False)

    bracket_3 = pd.read_csv("data/results_3.csv")
    bracket_3["points"] = bracket_3["points"].astype(int)
    bracket_3 = bracket_3.sort_values(by="points", ascending=False)

    bracket_4 = pd.read_csv("data/results_4.csv")
    bracket_4["points"] = bracket_4["points"].astype(int)
    bracket_4 = bracket_4.sort_values(by="points", ascending=False)

    return bracket_1, bracket_2, bracket_3, bracket_4


# @st.cache_data
def standings():
    col_names = {
        "gw": "Gameweek",
        "pos": "Position",
        "name": "Name",
    }
    standings_ts = pd.read_csv("data/standings_ts.csv")
    standings_ts["pos"] = standings_ts["pos"] * -1
    standings_ts = standings_ts.rename(columns=col_names)
    standings_ts["Gameweek"] = standings_ts["Gameweek"].astype(int)

    cumm_points = pd.read_csv("data/cumm_points.csv")

    return standings_ts, cumm_points


gw, teams = load_current_gw_teams()
(bracket_1, bracket_2, bracket_3, bracket_4) = load_bracket_dfs()
standings_ts, cumm_points = standings()

# Space out the maps so the first one is 2x the size of the other three
c1, c2 = st.columns((0.35, 0.55))

c1.header("Standings by GW Bracket")
gwbracket = c1.radio(
    "Choose GW Bracket. **\$50** Bracket Winner, **\$25** for Runner-up",
    ["Bracket 1", "Bracket 2", "Bracket 3", "Bracket 4"],
    captions=["GW 1 - 10", "GW 11 - 20", "GW 21 - 29", "GW 30 - 38"],
    horizontal=True,
    index=0,
)

if gwbracket == "Bracket 1":
    c1.dataframe(
        bracket_1.style.background_gradient(cmap="YlGn"),
        column_config={
            "img": st.column_config.ImageColumn(
                "DP", help="Streamlit app preview screenshots"
            )
        },
        hide_index=True,
        use_container_width=True,
    )
    update_team_totals([bracket_1], teams)

elif gwbracket == "Bracket 2":
    c1.dataframe(
        bracket_2.style.background_gradient(cmap="YlGn"),
        column_config={
            "img": st.column_config.ImageColumn(
                "DP", help="Streamlit app preview screenshots"
            )
        },
        hide_index=True,
        use_container_width=True,
    )
    update_team_totals([bracket_1, bracket_2], teams)
elif gwbracket == "Bracket 3":
    c1.dataframe(
        bracket_3.style.background_gradient(cmap="YlGn"),
        column_config={
            "img": st.column_config.ImageColumn(
                "DP", help="Streamlit app preview screenshots"
            )
        },
        hide_index=True,
        use_container_width=True,
    )
    update_team_totals([bracket_1, bracket_2, bracket_3], teams)
elif gwbracket == "Bracket 4":
    c1.dataframe(
        bracket_4.style.background_gradient(cmap="YlGn"),
        column_config={
            "img": st.column_config.ImageColumn(
                "DP", help="Streamlit app preview screenshots"
            )
        },
        hide_index=True,
        use_container_width=True,
    )
    update_team_totals([bracket_1, bracket_2, bracket_3, bracket_4], teams)

# # Display cumulative team totals
# c2.header(f"Cumulative Earnings up to {gwbracket}")
# totals_df = pd.DataFrame(
#     list(st.session_state.team_totals.items()), columns=["Team", "Total"]
# )
# totals_df = totals_df.sort_values("Total", ascending=False)
# c2.dataframe(
#     totals_df.style.background_gradient(cmap="YlGn"),
#     hide_index=True,
#     use_container_width=True,
# )

# st.sidebar.header(f"Cumulative Earnings up to {gwbracket}")
# for team, total in st.session_state.team_totals.items():
#     st.sidebar.markdown(f"**{team}:** ${total}")

# Prepare data for the table
totals_df = pd.DataFrame(
    list(st.session_state.team_totals.items()), columns=["Team", "Total"]
)
totals_df["Total"] = totals_df["Total"].apply(
    lambda x: f"${x}"
)  # Format totals as currency

# Add this section in the sidebar
st.sidebar.header(f"Cumulative Earnings up to {gwbracket}")
st.sidebar.table(totals_df)  # Display as a table


c2.header("Timeline")
# c2.caption("** Ignore minus sign, will fix later")
# c2.line_chart(standings_ts, x="Gameweek", y="Position", color="Name")

# First invert the Position values to be positive
standings_ts["Position"] = standings_ts["Position"].abs()


fig = px.line(
    standings_ts,
    x="Gameweek",
    y="Position",
    color="Name",
    title="League Position Timeline",
)

# Invert the y-axis since position 1 should be at the top
fig.update_layout(
    yaxis={
        "autorange": "reversed",
        "title": "Position",
        "tickmode": "linear",
        "tick0": 1,
        "dtick": 1,
    },
    height=600,
    template="plotly_dark",
)

# Add images for each team
for name in standings_ts["Name"].unique():
    fig.add_layout_image(
        dict(
            source=f"static/{name}.png",
            xref="paper",
            yref="paper",
            x=1.02,  # Position image to the right of the chart
            y=0.5,  # Center vertically
            sizex=0.1,
            sizey=0.1,
            xanchor="left",
            yanchor="middle",
        )
    )

# Replace the existing chart with the new one
c2.plotly_chart(fig, use_container_width=True)
