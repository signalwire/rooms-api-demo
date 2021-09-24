function Room(props) {
  return (
  <div className="card w-25 float-start">
    <div className="card-body">
      <h5 className="card-title">{props.room.display_name}</h5>
      <ul className="list-group list-group-flush">
        {props.room.members.map((member) => (
          <li key={props.room.id + member} className="list-group-item">{member}</li>
        ))}
      </ul>
      <p className="text-end">
        <a href="/?room={room.id}" className="btn btn-primary btn-sm" target="_blank">Join</a>
      </p>
    </div>
  </div>
  );
}

const RoomList = React.forwardRef((props, ref) => {
  const [data, setData] = React.useState(_mainList);

  React.useImperativeHandle(ref, () => ({
    updateList: (newList) => {
      setData(newList)
    }
  }));

  return (
    <div className="rooms">
      {data.map((room) => (
        <Room room={room} key={room.id}></Room>
      ))}
    </div>
  );
});

function App(){
  return (
    <RoomList ref={RoomList => { window.RoomList = RoomList }}/>
  )
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);