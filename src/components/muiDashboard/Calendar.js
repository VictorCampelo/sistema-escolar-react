import FullCalendar from "@fullcalendar/react";
import { Fragment, useEffect, useRef } from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import brLocale from "@fullcalendar/core/locales/pt-br";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  ListItemIcon,
  Menu,
  MenuItem,
  Popover,
  Tooltip
} from "@material-ui/core";
import {
  ChevronRight,
  ChevronLeft,
  Today,
  ViewComfy,
  ViewList,
  ViewWeek,
  Event,
  CalendarToday,
  Add,
  ViewAgenda,
  Visibility
} from "@material-ui/icons";
import { useState } from "react";
import { calendarRef } from "../../services/databaseRefs";
import { useSnackbar } from "notistack";
import SeeEventPopover from "../shared/SeeEventPopover";
import CreateEventPopover from "../shared/CreateEventPopover";
import CreateCalendar from "../shared/CreateCalendar";

const CalendarComponent = ({ sourceId, isFromClassCode = false, handleFault }) => {
  const initialView = localStorage.getItem("view") || "dayGridMonth";

  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const [eventsSources, setEventsSources] = useState([]);
  const [viewSources, setViewSources] = useState(eventsSources);
  const [sourceSelected, setSourceSelected] = useState({ id: "" });
  const [view, setView] = useState(initialView);
  const [eventId, setEventId] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [anchorElCreate, setAnchorElCreate] = useState(null);
  const [anchorElCal, setAnchorElCal] = useState(null);
  const [anchorElPop, setAnchorElPop] = useState(null);
  const [anchorElEventInfo, setAnchorElEventInfo] = useState(null);
  const [anchorElRightClick, setAnchorElRightClick] = useState(null);
  const [e, setE] = useState();
  const [openNewCalendar, setOpenNewCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [holidays, setHolidays] = useState(true);
  const [isMounted, setIsMounted] = useState(true);

  const [event, setEvent] = useState(false);
  const [api, setApi] = useState();

  useEffect(() => {
    setIsLoading(true);
    setIsMounted(true);
    fetchData();
    setIsMounted(false);

    return () => {
      calendarRef.off("value");
    };
  }, []);

  async function fetchData() {
    const handleDataChange = async (snapshot) => {
      const sources = await snapshot.val();
      if (snapshot.exists()) {
        isMounted && setEventsSources([...sources]);
      } else {
        isMounted && setEventsSources([]);
      }

      sources && sources.hasOwnProperty("length")
        ? isMounted && setViewSources(sources)
        : Object.values(sources).forEach((single) => isMounted && setViewSources([single]));

      setIsLoading(false);
    };

    const handleError = (error) => {
      setIsLoading(false);
      enqueueSnackbar(error.message, {
        title: "Error",
        variant: "error",
        key: "0",
        action: (
          <Button onClick={() => closeSnackbar("0")} color="inherit">
            Fechar
          </Button>
        )
      });
    };

    if (isFromClassCode || (!isFromClassCode && sourceId)) {
      calendarRef.orderByChild("id").equalTo(sourceId).on("value", handleDataChange, handleError);
    } else {
      calendarRef.on("value", handleDataChange, handleError);
    }
  }

  const open = Boolean(anchorEl);
  const openCreate = Boolean(anchorElCreate);
  const openPop = Boolean(anchorElPop);
  const openRightClick = Boolean(anchorElRightClick);
  const id = openPop ? "simple-popover" : null;
  const calendarEl = useRef();

  const getApi = () => {
    const { current: calendarDom } = calendarEl;
    console.log(calendarEl.current);

    return calendarDom ? calendarDom.getApi() : null;
  };

  const handlePreviousYear = () => {
    const API = getApi();
    API && API.prevYear();
  };

  const RightClickContent = () => {
    return (
      <>
        <Box m={2}>
          <Tooltip title={"Retroceder"}>
            <IconButton variant="outlined" edge="end" color="inherit" onClick={handlePreviousYear}>
              <ChevronLeft />
            </IconButton>
          </Tooltip>
        </Box>
      </>
    );
  };

  const handleLoadedEvents = (e) => {
    // console.log("event -->>", e);
  };

  const handleDateClick = (e) => {
    setE(e);
    setAnchorElCal(e.dayEl);
  };

  const handleViewChange = (e) => {
    localStorage.setItem("view", e.view.type);
  };

  const handleEventClick = (e) => {
    setEvent(e.event);
    setAnchorElEventInfo(e.el);
    const API = getApi();
    setApi(API);
  };

  const handleNextMonth = () => {
    const API = getApi();
    API && API.next();
  };

  const handlePreviousMonth = (e) => {
    console.log(e);
    if (e.type === "click") {
      const API = getApi();
      API && API.prev();
    } else {
      e.preventDefault();
      setAnchorElRightClick(e.currentTarget);
    }
  };

  const handleToday = () => {
    const API = getApi();
    console.log(API);
    API && API.today();
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCloseCreate = () => {
    setAnchorElCreate(null);
  };

  const handleChangeView = (view) => {
    const API = getApi();
    console.log(API);
    API && API.changeView(view);
    setView(view);
  };

  const handleCloseCal = () => {
    setAnchorElCal(null);
  };

  const handleClosePop = () => {
    setAnchorElPop(null);
  };

  const handleCloseEventInfo = () => {
    setAnchorElEventInfo(null);
  };

  const handleCloseRightClick = () => {
    setAnchorElRightClick(null);
  };

  const handleOpenNewCalendarDialog = () => {
    setOpenNewCalendar(true);
  };

  const handleShowSources = () => {};

  return (
    !isLoading && (
      <Fragment>
        <Popover
          id={id}
          open={openRightClick}
          anchorEl={anchorElRightClick}
          onClose={handleCloseRightClick}
          anchorOrigin={{
            vertical: "top",
            horizontal: "left"
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right"
          }}>
          <RightClickContent />
        </Popover>

        <CreateCalendar open={openNewCalendar} handleClose={() => setOpenNewCalendar(false)} />

        {/* Popover to see an event */}

        {anchorElEventInfo && (
          <SeeEventPopover
            anchorElEventInfo={anchorElEventInfo}
            handleClose={handleCloseEventInfo}
            event={event}
            eventSourceId={sourceSelected.id}
            api={api}
            isFromClassCode={isFromClassCode}
            handleFault={handleFault}
          />
        )}

        {/* Popover for creating events */}

        {anchorElCal && (
          <CreateEventPopover
            anchorElEventCreate={anchorElCal}
            handleClose={handleCloseCal}
            api={api}
            setSourceSelected={setSourceSelected}
            sourceSelected={sourceSelected}
            eventId={eventId}
            setEventId={setEventId}
            e={e}
            calendarEl={calendarEl}
            eventsSources={eventsSources}
            handleOpenNewCalendarDialog={handleOpenNewCalendarDialog}
            isFromClassCode={isFromClassCode}
          />
        )}

        <Grid justifyContent="space-between" container spacing={24} alignItems="center">
          <Grid item>
            <Tooltip title={"Anterior"}>
              <IconButton
                variant="outlined"
                edge="end"
                color="inherit"
                onContextMenu={handlePreviousMonth}
                onClick={handlePreviousMonth}>
                <ChevronLeft />
              </IconButton>
            </Tooltip>
            <Tooltip title={"Próximo"}>
              <IconButton variant="outlined" edge="end" color="inherit" onClick={handleNextMonth}>
                <ChevronRight />
              </IconButton>
            </Tooltip>
            <Tooltip title={"Hoje"}>
              <IconButton variant="outlined" edge="end" color="inherit" onClick={handleToday}>
                <Today />
              </IconButton>
            </Tooltip>

            <Tooltip title={"Criar"}>
              <IconButton
                variant="outlined"
                edge="end"
                color="inherit"
                onClick={(e) => setAnchorElCreate(e.currentTarget)}>
                <Add />
              </IconButton>
            </Tooltip>

            <Menu
              id="menu-appbar"
              anchorEl={anchorElCreate}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right"
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "left"
              }}
              open={openCreate}
              onClose={handleCloseCreate}
              title="Visualização">
              <MenuItem
                onClick={(e) => setAnchorElCal(e.currentTarget)}
                disabled={eventsSources.length === 0}>
                <ListItemIcon>
                  <Event fontSize="small" />
                </ListItemIcon>
                Novo evento
              </MenuItem>
              {!isFromClassCode && (
                <MenuItem onClick={() => handleOpenNewCalendarDialog()}>
                  <ListItemIcon>
                    <CalendarToday fontSize="small" />
                  </ListItemIcon>
                  Criar calendário
                </MenuItem>
              )}
            </Menu>
          </Grid>

          <Grid item>
            {!isFromClassCode && (
              <Tooltip title={"Calendários"}>
                <IconButton
                  variant="outlined"
                  edge="end"
                  color="inherit"
                  onClick={(e) => setAnchorElPop(e.currentTarget)}>
                  <ViewAgenda />
                </IconButton>
              </Tooltip>
            )}
            <Popover
              id={id}
              open={openPop}
              anchorEl={anchorElPop}
              onClose={handleClosePop}
              anchorOrigin={{
                vertical: "top",
                horizontal: "left"
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right"
              }}>
              <Box m={2}>
                <InputLabel id="label">Exibir calendários:</InputLabel>
                {eventsSources &&
                  eventsSources.map((calendar, i) => (
                    <FormControlLabel
                      key={i}
                      control={
                        <Checkbox
                          checked={viewSources.indexOf(calendar) !== -1}
                          onChange={(e) => handleShowSources(calendar.id, e.target.checked)}
                          name={calendar.id}
                        />
                      }
                      label={calendar.id}
                    />
                  ))}

                <Tooltip title={"Ver todos os calendários"}>
                  <IconButton variant="outlined" edge="end" color="inherit">
                    <Visibility />
                  </IconButton>
                </Tooltip>
              </Box>
            </Popover>

            <Tooltip title={"Tipo de visualização"}>
              <IconButton
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
                edge="end"

                //style={{maxWidth: '34px'}}
              >
                {view === "dayGridMonth" && <ViewComfy />}
                {view === "timeGridWeek" && <ViewWeek />}
                {view === "listWeek" && <ViewList />}
              </IconButton>
            </Tooltip>

            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right"
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right"
              }}
              open={open}
              onClose={handleClose}
              title="Visualização">
              <MenuItem onClick={() => handleChangeView("dayGridMonth")}>
                <ListItemIcon>
                  <ViewComfy fontSize="small" />
                </ListItemIcon>
                Mês
              </MenuItem>
              <MenuItem onClick={() => handleChangeView("timeGridWeek")}>
                <ListItemIcon>
                  <ViewWeek fontSize="small" />
                </ListItemIcon>
                Semana
              </MenuItem>
              <MenuItem onClick={() => handleChangeView("listWeek")}>
                <ListItemIcon>
                  <ViewList fontSize="small" />
                </ListItemIcon>
                Lista semanal
              </MenuItem>
            </Menu>
          </Grid>
        </Grid>
        <div style={{ width: "100%" }}>
          <FullCalendar
            ref={calendarEl}
            aspectRatio={2}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={initialView}
            headerToolbar={{
              left: "",
              center: "title",
              right: ""
            }}
            locale={brLocale}
            eventSources={viewSources}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            viewDidMount={handleViewChange}
            eventsSet={handleLoadedEvents}
            editable={true}
          />
        </div>
      </Fragment>
    )
  );
};

export default CalendarComponent;
