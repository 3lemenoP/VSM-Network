function vsmIndividual_ver01(sif,conn)

%% NOTE the function call in 'recur' MUST be the same as the main function

    if nargin < 1
        s.conn=createConn();
      % default sif
        s.sif = '0/0/1'; 
    else
        s.conn=conn;
        s.sif=sif;
    end

hfig=figure('units','normalized');
set(hfig,'color',[0 0 0],'Toolbar','none','menubar','none')
set(hfig,'Name','VSM SiF','Numbertitle','off')

s.ax=axes('Parent',hfig,'units','normalized','Position',[0.05,0.05,0.9,0.9],'Tag','hmap','Color',[0 0 0],'NextPlot','add');
hold on

s.cursor=uicontrol('Parent',hfig,'style','edit','units','normalized','Position',[0,0,1,0.05],'Tag','hcursor',...
                   'BackgroundColor',[0.1 0.1 0.1],'ForegroundColor',[0.8 0.8 0.8],'String','Talk To Me ?  .....','FontSize',18);


contextMenuAxes(s.ax,s);  

getData(s); 

function recur(~,~,s,sif,direction)

if strcmp(direction,'u')

sqlQuery=[' SELECT DISTINCT parentId',...
          ' FROM [iOrgX] ',...
          ' WHERE childId = ',strcat('''',sif,'''')];

    e=exec(s.conn,sqlQuery);
    e=fetch(e);
    x=e.Data;
    close(e)

    sif=x{1,1};

end

    vsmIndividual_ver01(sif,s.conn)
    identify(0,0,0,sif)

function [s]=getData(s)    

sqlQuery=[' SELECT DISTINCT orgUnit',...
          ' FROM [iOrgX] ',...
          ' WHERE childId = ',strcat('''',s.sif,'''')];

        e=exec(s.conn,sqlQuery);
        e=fetch(e);
        s.orgUnit=e.Data;
        close(e)

sqlQuery=[' SELECT DISTINCT childId,orgUnit',...
          ' FROM [iOrgX] ',...
          ' WHERE parentId = ',strcat('''',s.sif,''''),...
          ' ORDER BY childId '];

        e=exec(s.conn,sqlQuery);
        e=fetch(e);
        s.childName=e.Data;
        close(e)

        if size(s.childName,2)==1

            s.childName{1,1}='noChildren';
            s.childName{1,2}='noChildren';

        end

s.noS1s=size(s.childName,1);

contextMenuAxes(s.ax,s);  

createVSM(s)

function contextMenuAxes(ax,s)

  cmenu=uicontextmenu;   
  set(ax,'UIContextMenu',cmenu)
    
       uimenu(cmenu,'Label','refresh screen','Callback',{@updateScreen,s});
    u0=uimenu(cmenu,'Label','manage database','Separator','on');
       uimenu(u0,'Label','clear database','Callback',{@updateDatabase,s,'clearTable'});
    u0=uimenu(cmenu,'Label','view conversations','Separator','on');
       uimenu(u0,'Label','stigmeric conversations','Callback',{@stigmergicConversations,s,'stigmergy'});
       uimenu(u0,'Label','pheromonal conversations','Callback',{@stigmergicConversations,s,'pheromonal'});
  
function createVSM(s)

axes(s.ax)

% Define the size and spacing of the squares
square_size = 50;
spacing = 20;
radius = square_size / 2;
circle_spacing = square_size + 0.5 * square_size;

% Compute the y-coordinates for the bottom-left corner of each square
y3 = 0; % For S3
y2 = y3 + square_size + spacing; % For S4
y1 = y2 + square_size + spacing; % For S5

% Define triangle height (equal to square size for an isosceles triangle)
triangle_height = square_size;

% Define coordinates for the triangles
gap = square_size;

left_triangle_x = [-gap - square_size, -gap - 0.5*square_size, -gap]+20;
left_triangle_y = [y3, y3 + triangle_height, y3]-10;

right_triangle_x = [gap + square_size, gap + 1.5*square_size, gap + 2*square_size]-20;
right_triangle_y = [y3 + triangle_height, y3, y3 + triangle_height]-10;

% Calculate y-coordinate of the center of the bottom circle
y_center_bottom_circle = y3 - s.noS1s * circle_spacing;

% Drawing a vertical line from the base of the first square (S5) to the top of the last circle //el lines

policyLine=line([square_size/2, square_size/2], [y1, y_center_bottom_circle], 'Color', [1 1 0], 'LineWidth', 1);
strategyLine=line([square_size/2-radius/2, square_size/2-radius/2], [y2, y_center_bottom_circle], 'Color', [1 0 0], 'LineWidth', 2);
resourceBargainLine=line([square_size/2+radius/2, square_size/2+radius/2], [y3, y_center_bottom_circle], 'Color', [0 1 0], 'LineWidth', 12);

y_mid = (y3 + triangle_height/2 + y3) / 2;
auditFunction=line([-gap - 0.5*square_size+20, 0], [y_mid, y_mid], 'Color', [0 0.5 0], 'LineWidth', 1);  % Line from center of S3* to S3
stabilityFunction=line([square_size, gap + 1.5*square_size-20], [y_mid, y_mid], 'Color', [0 0.5 0], 'LineWidth', 2);  % Line from S3 to center of S2


%% Define the LHS 3-4 homeostat

start_point = [0 - square_size/2, y2 + square_size/2];
end_point = [0 - square_size/2, y3 + square_size/2];

P1 = [start_point(1)+radius, start_point(2)];
P2 = [end_point(1)+radius, end_point(2)];

% Calculate the mid point
mid_point = (P1 + P2) / 2;

% Determine a control point. We will offset it in the x-direction to make the arc shallow.
offset = -50; % Adjust this value to the left or right for a more/less pronounced arc
control_point = [mid_point(1) + offset, mid_point(2)];

% Generate the Bezier curve
t = linspace(0, 1, 100);
arc_x = (1-t).^2.*P1(1) + 2*(1-t).*t.*control_point(1) + t.^2.*P2(1);
arc_y = (1-t).^2.*P1(2) + 2*(1-t).*t.*control_point(2) + t.^2.*P2(2);

% Plot the arc
plot(arc_x, arc_y, 'g-', 'LineWidth', 20); % Arc in blue
hold on;
%plot([P1(1), P2(1)], [P1(2), P2(2)], 'go'); % End points in red

% Plot the triangle
minArcX=min(arc_x);
meanArcY=mean(arc_y);
base=(minArcX+radius/2)-(minArcX-radius/2);
h=sqrt(base^2-(base/2)^2);

% Define the coordinates of the triangle's vertices = 
A = [minArcX-radius/2, minArcX+radius/2]; % One endpoint of the base
operationsHomeostat=fill([A(1),A(2),A(1)+base/2],[meanArcY,meanArcY,meanArcY+h],[0 0.5 0]);


%% Define the RHS homeostat

start_point = [0 + square_size/2, y2 + square_size/2];
end_point = [0 + square_size/2, y3 + square_size/2];

P1 = [start_point(1)+radius, start_point(2)];
P2 = [end_point(1)+radius, end_point(2)];

% Calculate the mid point
mid_point = (P1 + P2) / 2;

% Determine a control point. We will offset it in the x-direction to make the arc shallow.
offset = 50; % Adjust this value to the left or right for a more/less pronounced arc
control_point = [mid_point(1) + offset, mid_point(2)];

% Generate the Bezier curve
t = linspace(0, 1, 100);
arc_x = (1-t).^2.*P1(1) + 2*(1-t).*t.*control_point(1) + t.^2.*P2(1);
arc_y = (1-t).^2.*P1(2) + 2*(1-t).*t.*control_point(2) + t.^2.*P2(2);

% Plot the arc
plot(arc_x, arc_y, 'r-', 'LineWidth', 20); % Arc in blue
hold on;
plot([P1(1), P2(1)], [P1(2), P2(2)], 'ro'); % End points in red

maxArcX=max(arc_x);
meanArcY=mean(arc_y);

% Define the coordinates of the triangle's vertices
A = [maxArcX-radius/2, maxArcX+radius/2]; % One endpoint of the base
strategyHomeostat=fill([A(1),A(2),A(1)+base/2],[meanArcY,meanArcY,meanArcY-h],[0.6 0 0]);


%% Draw S5

h=rectangle('Position',[0, y1,square_size, square_size],'LineWidth',4,'EdgeColor',[1 1 0],'FaceColor',[0 0 0],'Tag','S5');
hh=rectangle('Position',[0, y1,square_size, square_size],'EdgeColor',[0 0 0],'FaceColor',[1 1 0],'Tag','S5info');


        % New width and height
        newWidth = 25;
        newHeight = 25;

        % Get current position of the rectangle
        pos = get(hh, 'Position');

        % Compute center of the current rectangle
        centerX = pos(1) + pos(3)/2;
        centerY = pos(2) + pos(4)/2;

        % Calculate new x and y such that the rectangle's center remains unchanged
        newX = centerX - newWidth/2;
        newY = centerY - newHeight/2;

        % Update the rectangle's position
        set(hh, 'Position', [newX, newY, newWidth, newHeight]);

 text(0 + square_size/2, y1 + square_size/2,s.orgUnit, 'FontSize', 12, 'Color', [0 0 0],...
     'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');
 h.UserData=s.sif;
      contextMenuS5(h,s,s.sif)

 %variety1=text(0 + square_size/2, y1 + square_size/2 + 150 ,'interface Variety = 50000 organisation points', 'FontSize', 12, 'Color', [1 0 0],...
     %'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');
 %variety2=text(0 + square_size/2, y1 + square_size/2 + 120 ,'within 3 key clicks', 'FontSize', 12, 'Color', [1 0 0],...
     %'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');
 %variety2=text(0 + square_size/2, y1 + square_size/2 + 90 ,'organisational complexity absorbed by the model', 'FontSize', 12, 'Color', [1 0 0],...
     %'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');
 variety2=text(0 + square_size/2, y1 + square_size/2 + 60 ,'model driven object placement !!!!!', 'FontSize', 12, 'Color', [1 1 1],...
     'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');

%% Draw S4

  rectangle('Position', [0, y2, square_size, square_size], 'EdgeColor',[1 0 0],'FaceColor', [0 0 0],'Tag','S4'); % 
  hh=rectangle('Position', [0, y2, square_size, square_size], 'EdgeColor', [0.5 0 0],'FaceColor', [0.5 0 0],'Tag','S4info');

        % New width and height
        newWidth = 25;
        newHeight = 25;

        % Get current position of the rectangle
        pos = get(hh, 'Position');

        % Compute center of the current rectangle
        centerX = pos(1) + pos(3)/2;
        centerY = pos(2) + pos(4)/2;

        % Calculate new x and y such that the rectangle's center remains unchanged
        newX = centerX - newWidth/2;
        newY = centerY - newHeight/2;

        % Update the rectangle's position
        set(hh, 'Position', [newX, newY, newWidth, newHeight]);

    x1 = centerX-square_size/2;
    y1 = centerY;

text(0 + square_size/2, y2 + square_size/2, 'S4', 'FontSize', 12, 'Color', [1 1 1],...
    'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');

        % Parameters of the Ellipse
            width = 40;  % Minor axis length (horizontal axis)
            height = 300; % Major axis length (vertical axis)
        
        % Ellipse center coordinates
            h = pos(1) + pos(3)/2 - radius -120; % x-coordinate of the center
            k = pos(2) + pos(4)/2; % y-coordinate of the center
            theta = linspace(0, 2*pi, 100);
            x = h + 0.9*width/2 * cos(theta);
            y = k + height/2 * sin(theta);
            p = fill(x, y, [1 0 0],'EdgeColor', [1 1 1], 'FaceAlpha', 0.5, 'LineWidth', 2);

         topS4Ellipse=ceil(max(y));
            
 text(h, k, s.sif, 'FontSize', 16, 'Color', [1 1 1],...
    'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');

    x2 = max(x);
    y2 = mean(y);

   % draw the beziur curve 

    P1 = [x1,y1];
    P2 = [x2,y2];
    
    % Calculate the mid point
    mid_point = (P1 + P2) / 2;
    
    % Determine a control point. We will offset it in the x-direction to make the arc shallow.
    offset = -20; % Adjust this value to the left or right for a more/less pronounced arc
    control_point = [mid_point(1),mid_point(2)+ offset];
    t = linspace(0, 1, 100);

    arc_x = (1-t).^2.*P1(1) + 2*(1-t).*t.*control_point(1) + t.^2.*P2(1);
    arc_y = (1-t).^2.*P1(2) + 2*(1-t).*t.*control_point(2) + t.^2.*P2(2);
    plot(arc_x, arc_y,'Color',[0.8 0 0],'LineWidth',5,'LineStyle','-');

    offset = 20; % Adjust this value to the left or right for a more/less pronounced arc
    control_point = [mid_point(1),mid_point(2)+ offset];
    t = linspace(0, 1, 100);

    arc_x = (1-t).^2.*P1(1) + 2*(1-t).*t.*control_point(1) + t.^2.*P2(1);
    arc_y = (1-t).^2.*P1(2) + 2*(1-t).*t.*control_point(2) + t.^2.*P2(2);
    plot(arc_x, arc_y,'Color',[0.8 0 0], 'LineWidth', 5,'LineStyle','-');


%% Draw S3

  rectangle('Position', [0, y3, square_size, square_size], 'EdgeColor', [0 1 0], 'FaceColor', [0 0 0],'Tag','S3');
  hh=rectangle('Position', [0, y3, square_size, square_size], 'EdgeColor', [0 0.5 0],'FaceColor', [0 0.5 0],'Tag','S3info');


        % New width and height
        newWidth = 45;
        newHeight = 25;

        % Get current position of the rectangle
        pos = get(hh, 'Position');

        % Compute center of the current rectangle
        centerX = pos(1) + pos(3)/2;
        centerY = pos(2) + pos(4)/2;

        % Calculate new x and y such that the rectangle's center remains unchanged
        newX = centerX - newWidth/2;
        newY = centerY - newHeight/2;

        % Update the rectangle's position
        set(hh,'Position', [newX, newY, newWidth, newHeight]);


  text(0 + square_size/2, y3 + square_size/2, 'S3', 'FontSize', 12, 'Color', [1 1 1],...
       'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');

%% Draw the isosceles triangles

fill(left_triangle_x, left_triangle_y, [0.3 0.3 0.3]); % Left triangle
text(mean(left_triangle_x), y3 + triangle_height/2-10, 'S3*', 'FontSize', 12, 'Color', [0 0 0],...
    'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');

fill(right_triangle_x, right_triangle_y, [0.3 0.3 0.3]); % Right triangle
text(mean(right_triangle_x), y3 + triangle_height/2-10, 'S2', 'FontSize', 12, 'Color', [0 0 0],...
    'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');


%% Draw the S1's and their Markets

for i = 1:s.noS1s  

   % Draw  s1's

    y_center = y3 - (i * circle_spacing);
    circle_pos = [-radius + square_size/2, y_center-radius, 2*radius, 2*radius];
    h=rectangle('Position', circle_pos, 'Curvature', [1 1],'LineWidth',2, 'EdgeColor', [1 1 1],'FaceColor', [0 0 0],'Tag',s.childName{i});
    text(0+radius, y_center, s.childName{i,2}, 'FontSize', 12, 'Color', 'r', 'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');
    contextMenuS1(h,s,s.childName{i,1})

    x1 = -radius + square_size/2;
    y1 = y_center-radius+radius;

  % Draw Overlapping offset s1's as local environments as Patches
 
    y_center = y3 - (i * circle_spacing);
    width = 25;                            % Minor axis length (horizontal axis)
    height = 120;                          % Major axis length (vertical axis)
    h1 = -radius + square_size/2-120;      % x-coordinate of the center
    k1 =  y_center;                        % y-coordinate of the center
    theta = linspace(0, 2*pi, 100);
    x = h1 + width/2 * cos(theta);         % x poly coordinates
    y = k1 + height/2 * sin(theta);        % y poly coordinates
    p = fill(x, y, [0.8 0.8 0.8],'EdgeColor', [1 1 1],'FaceAlpha',0.5,'LineWidth',2);  % draw patch

    bottomLastS1Ellipse=ceil(min(y));

    text(h1, k1, s.childName{i,1}, 'FontSize', 12, 'Color', [1 1 1],'HorizontalAlignment', 'center', 'VerticalAlignment', 'middle');
    contextMenuS1(p,s,s.childName{i,1})

    xMid=h1;

  % draw line between s1 and the environment

    x2 = max(x);
    y2 = mean(y);

    % line([x1,x2], [y1,y2], 'Color', [1 1 1], 'LineWidth',1,'LineStyle','-.');

  % draw the beziur curve 

    P1 = [x1,y1];
    P2 = [x2,y2];
    
    % Calculate the mid point
    mid_point = (P1 + P2) / 2;
    
    % Determine a control point. We will offset it in the x-direction to make the arc shallow.
    offset = -10; % Adjust this value to the left or right for a more/less pronounced arc
    control_point = [mid_point(1),mid_point(2)+ offset];
    t = linspace(0, 1, 100);

    arc_x = (1-t).^2.*P1(1) + 2*(1-t).*t.*control_point(1) + t.^2.*P2(1);
    arc_y = (1-t).^2.*P1(2) + 2*(1-t).*t.*control_point(2) + t.^2.*P2(2);
    plot(arc_x, arc_y,'Color',[0.8 0.8 0.8],'LineWidth',1,'LineStyle','-');

    offset = 10; % Adjust this value to the left or right for a more/less pronounced arc
    control_point = [mid_point(1),mid_point(2)+ offset];
    t = linspace(0, 1, 100);

    arc_x = (1-t).^2.*P1(1) + 2*(1-t).*t.*control_point(1) + t.^2.*P2(1);
    arc_y = (1-t).^2.*P1(2) + 2*(1-t).*t.*control_point(2) + t.^2.*P2(2);
    plot(arc_x, arc_y,'Color',[0.8 0.8 0.8], 'LineWidth', 1,'LineStyle','-');
    
end

    yMid=(bottomLastS1Ellipse+topS4Ellipse)/2;

    theta = linspace(0, 2*pi, 100);
    x = xMid + width * cos(theta);           % x poly coordinates
    y = yMid + 1.1*(topS4Ellipse-yMid) * sin(theta);        % y poly coordinates
    p = fill(x, y, [0.8 0 0],'EdgeColor', [1 1 1],'FaceAlpha',0,'LineWidth',2);  % draw patch
            
% draw the control lines

% Calculate the y-coordinate of the top of the last circle
y_top_last_circle = y3 - (s.noS1s * circle_spacing) + radius;

% draw the control lines

% For left triangle
line([-gap - 0.5*square_size+20, -gap - 0.5*square_size+20], [y3-10, y_top_last_circle], 'Color', [0 0.5 0], 'LineWidth', 1);

% For right triangle
line([gap + 1.5*square_size-20, gap + 1.5*square_size-20], [y3-10, y_top_last_circle], 'Color', [0 0.5 0], 'LineWidth', 1);

% add a line between each circle and the vertical line

for i = 1:s.noS1s  

    % For left triangle
       line([-gap - 0.5*square_size+20,   (y3 + (circle_spacing)+-gap - 0.5*square_size)/2 ],...
            [y3 - (i* circle_spacing) + radius,  (y3 - (i * circle_spacing) - radius+y3 - (i* circle_spacing) + radius)/2],...
            'Color', [0 0.5 0], 'LineWidth', 1);

    % For right triangle
       line([-gap - 0.5*square_size+radius*8-20,   (y3 + (circle_spacing)+-gap - 0.5*square_size)/2 + radius*2],...
            [y3 - (i* circle_spacing) + radius,   (y3 - (i * circle_spacing) - radius+y3 - (i* circle_spacing) + radius)/2],...
            'Color', [0 0.5 0], 'LineWidth', 1);
end


function contextMenuS5(h,s,sif)

  cmenu=uicontextmenu;   
  set(h,'UIContextMenu',cmenu)
  
    uimenu(cmenu,'Label','Identify','Callback',{@identify,s,sif});
    uimenu(cmenu,'Label','recur up','Callback',{@recur,s,sif,'u'});
    
function contextMenuS1(h,s,sif)

  cmenu=uicontextmenu;   
  set(h,'UIContextMenu',cmenu)
  
       uimenu(cmenu,'Label','Identify','Callback',{@identify,s,sif});
       uimenu(cmenu,'Label','create SIF VSM','Callback',{@recur,s,sif,'d'});
       
function identify(~,~,~,sif)

    obj = findobj(findobj(gcf, 'Tag', 'globalFig'), 'Type', 'scatter', 'Tag', sif);

   if ~isempty(obj)

        origSize = obj.SizeData;
        origColor = obj.CData;
    
          for i=1:10
              obj.SizeData = 200;
              obj.CData = [1 1 1];
              pause(0.5)
              obj.CData = [0 0 0];
              pause(0.3)
          end
    
       obj.SizeData = origSize;
       obj.CData = origColor;

   end

 % scatterObj = findobj(findobj('Type', 'figure', 'Tag', 'globalFig'), 'Type', 'scatter', 'Tag', '1/1/1');
 % sizeData = findobj(findobj('Type', 'figure', 'Tag', 'globalFig'), 'Type', 'scatter', 'Tag', '1/1/1').SizeData




